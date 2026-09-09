"""Shared CSV/XLSX parsing for timetable and maintenance imports.

Both return a list of header-keyed row dicts. Row numbers in error messages
are 1-based including the header row, matching what operators see in Excel.
"""
import csv
import io
from typing import List, Dict, Any
from fastapi import HTTPException


def parse_csv_bytes(content: bytes) -> List[Dict[str, Any]]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded")
    try:
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV has no header row")
        return [dict(r) for r in reader if any((v or "").strip() for v in r.values())]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")


def parse_xlsx_bytes(content: bytes) -> List[Dict[str, Any]]:
    try:
        from openpyxl import load_workbook
    except ImportError:
        raise HTTPException(status_code=400, detail="XLSX support not installed (openpyxl missing)")
    try:
        wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse XLSX: {e}")
    if not rows or not any(rows[0]):
        raise HTTPException(status_code=400, detail="XLSX sheet is empty")
    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    out = []
    for r in rows[1:]:
        vals = [("" if v is None else v) for v in r]
        if not any(str(v).strip() for v in vals):
            continue
        out.append(dict(zip(headers, vals)))
    return out


def parse_upload(filename: str, content: bytes) -> List[Dict[str, Any]]:
    name = (filename or "").lower()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if name.endswith(".csv"):
        return parse_csv_bytes(content)
    if name.endswith((".xlsx", ".xlsm")):
        return parse_xlsx_bytes(content)
    raise HTTPException(status_code=400, detail="Only .csv and .xlsx files are supported")
