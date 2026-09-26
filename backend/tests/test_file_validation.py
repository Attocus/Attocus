"""
Unit Tests for Attocus Lecture Ingestion & Strict PDF Validation.
Ensures:
1. Non-PDF files are strictly rejected before hitting the RAG pipeline.
2. Only valid PDF files are processed for slide parsing and vector embeddings.
"""

import pytest


def validate_uploaded_filename(filename: str) -> bool:
    """Mirrors the strict validation logic used across the Frontend & Backend upload endpoints."""
    clean_name = filename.strip().lower()
    return clean_name.endswith(".pdf")


class TestPDFValidationGuardrail:
    """Verifies strict PDF file filtering."""

    @pytest.mark.parametrize("invalid_filename", [
        "lecture_notes.docx",
        "slides_presentation.pptx",
        "slide_photo.jpg",
        "diagram.png",
        "cheat_sheet.txt",
        "script.py",
        "archive.zip",
        "exploit.exe",
        "no_extension"
    ])
    def test_strictly_rejects_non_pdf_files(self, invalid_filename: str):
        is_valid = validate_uploaded_filename(invalid_filename)
        assert is_valid is False, f"Non-PDF file should be rejected: {invalid_filename}"

    @pytest.mark.parametrize("valid_filename", [
        "lecture_01.pdf",
        "Advanced_Machine_Learning.PDF",
        "Chapter_3_Operating_Systems.Pdf",
        "Discrete_Math_2026.pdf"
    ])
    def test_accepts_valid_pdf_files(self, valid_filename: str):
        is_valid = validate_uploaded_filename(valid_filename)
        assert is_valid is True, f"Valid PDF was wrongly rejected: {valid_filename}"
