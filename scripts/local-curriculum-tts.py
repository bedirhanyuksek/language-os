"""Offline Kokoro and Silero worker. Weights and Python packages are provisioned separately."""
import hashlib
from importlib.metadata import version
import json
import os
from pathlib import Path
import sys
import wave

import numpy as np

RATE = 24_000
MODELS = json.loads(Path(__file__).with_name("curriculum-tts-models.json").read_text())


def checked_model(language):
    model = MODELS[language]
    variable = "LANGUAGE_OS_KOKORO_DIR" if language == "en" else "LANGUAGE_OS_SILERO_DIR"
    if not os.environ.get(variable):
        raise ValueError(f"{variable} is required")
    directory = Path(os.environ[variable])
    for name, digest in model["weights"].items():
        with (directory / name).open("rb") as handle:
            if hashlib.file_digest(handle, "sha256").hexdigest() != digest:
                raise ValueError(f"Unexpected weights for {name}")
    for name, expected in model["runtime"].items():
        if version(name) != expected:
            raise ValueError(f"{name} requires version {expected}")
    return directory


def synthesizer(language):
    directory = checked_model(language)
    if language == "en":
        from kokoro_onnx import Kokoro

        voice_pack = {
            voice: np.fromfile(directory / (voice + ".bin"), dtype="<f4").reshape(-1, 1, 256)
            for voice in MODELS[language]["voices"]
        }
        from tempfile import TemporaryDirectory
        with TemporaryDirectory(prefix="kokoro-voices-") as temporary:
            path = Path(temporary) / "voices.bin"
            with path.open("wb") as handle:
                np.savez(handle, **voice_pack)
            engine = Kokoro(str(directory / "model_quantized.onnx"), str(path))
            # np.load returns a lazy archive. Retain the arrays after the temporary file closes.
            engine.voices = voice_pack

        def render(voice, text):
            audio, rate = engine.create(text.replace("’", "'"), voice=voice, lang="en-us", speed=1)
            if rate != RATE:
                raise ValueError(f"Unexpected sample rate: {rate}")
            return audio

        return render

    import torch

    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    model = torch.package.PackageImporter(str(directory / "v5_cis_base.pt")).load_pickle("tts_models", "model")
    model.to(torch.device("cpu"))

    def render(voice, text):
        with torch.inference_mode():
            return model.apply_tts(text=text, speaker=voice, sample_rate=RATE).detach().cpu().numpy()

    return render


def audio_segment(samples):
    audio = np.asarray(samples).reshape(-1)
    if not audio.size or not np.isfinite(audio).all():
        raise ValueError("Invalid audio samples")
    active = np.flatnonzero(np.abs(audio) >= 0.006)
    if not active.size:
        raise ValueError("No audible speech")
    audio = audio[max(0, active[0] - 1200):active[-1] + 1201]
    rms = np.sqrt(np.mean(audio[np.abs(audio) >= 0.006] ** 2))
    return audio * min(0.12 / rms, 0.85 / np.max(np.abs(audio)))


def write_clip(render, item):
    audio = []
    for segment in item["job"]["segments"]:
        if audio:
            audio.append(np.zeros(round(RATE * 0.38)))
        audio.append(audio_segment(render(segment["voice"], segment["input"])))
    with wave.open(item["wavPath"], "wb") as result:
        result.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        result.writeframes((np.concatenate(audio) * 32767).astype("<i2").tobytes())


def main(input_path, output_path):
    requests = json.loads(Path(input_path).read_text())
    failures = {}
    for language in {item["job"]["language"] for item in requests}:
        group = [item for item in requests if item["job"]["language"] == language]
        try:
            render = synthesizer(language)
        except Exception as error:
            failures.update({item["job"]["id"]: str(error) for item in group})
            continue
        for item in group:
            try:
                write_clip(render, item)
            except Exception as error:
                failures[item["job"]["id"]] = str(error)
    Path(output_path).write_text(json.dumps(failures, ensure_ascii=False))


if __name__ == "__main__":
    main(*sys.argv[1:])
