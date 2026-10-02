"""Audit probes, isolated test workflow only. Observations are not regression assertions."""
import pathlib, runpy
runpy.run_path(str(pathlib.Path(__file__).resolve().parents[1] / "audit" / "2026-10-02" / "deep-oct02.py"), run_name="__main__")
