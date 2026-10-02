import pathlib, runpy
runpy.run_path(str(pathlib.Path(__file__).resolve().parents[1] / 'audit' / 'audit-depth.py'), run_name='__main__')
