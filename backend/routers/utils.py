import io
import base64
import tempfile
import os
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from PIL import Image
import pytesseract
import PyPDF2
from PyPDF2 import PdfReader
from email import message_from_string
from email.policy import default
import mimetypes

class FileProcessor:
    """Handle various file types and extract content"""
    
    @staticmethod
    def extract_text_from_file(file_content: bytes, filename: str) -> str:
        """
        Extract text from various file types
        """
        file_ext = os.path.splitext(filename)[1].lower()
        
        try:
            if file_ext == '.pdf':
                return FileProcessor.extract_from_pdf(file_content)
            elif file_ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']:
                return FileProcessor.extract_from_image(file_content)
            elif file_ext == '.eml':
                return FileProcessor.extract_from_eml(file_content)
            elif file_ext in ['.txt', '.csv', '.log']:
                return file_content.decode('utf-8', errors='ignore')
            elif file_ext in ['.doc', '.docx']:
                return FileProcessor.extract_from_docx(file_content)
            else:
                return file_content.decode('utf-8', errors='ignore')
        except Exception as e:
            return f"Error extracting text: {str(e)}"

    @staticmethod
    def extract_from_pdf(file_content: bytes) -> str:
        """Extract text from PDF"""
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name
            # Use PyPDF2 to read PDF and extract text from each page
            reader = PdfReader(tmp_path)
            text = ""
            for page in reader.pages:
                try:
                    page_text = page.extract_text() or ""
                except Exception:
                    page_text = ""
                text += page_text

            os.unlink(tmp_path)
            return text
        except Exception as e:
            raise RuntimeError(f"PDF extraction error: {str(e)}")

    @staticmethod
    def extract_from_image(file_content: bytes) -> str:
        """Extract text from image using OCR"""
        try:
            image = Image.open(io.BytesIO(file_content))
            text = pytesseract.image_to_string(image)
            return text
        except Exception as e:
            raise RuntimeError(f"Image OCR error: {str(e)}")

    @staticmethod
    def extract_from_eml(file_content: bytes) -> str:
        """Extract text from EML file"""
        try:
            email_string = file_content.decode('utf-8', errors='ignore')
            msg = message_from_string(email_string, policy=default)
            
            text = f"From: {msg.get('From')}\n"
            text += f"To: {msg.get('To')}\n"
            text += f"Subject: {msg.get('Subject')}\n"
            text += f"Date: {msg.get('Date')}\n\n"
            
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        text += part.get_payload(decode=True).decode('utf-8', errors='ignore')
            else:
                text += msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            
            return text
        except Exception as e:
            raise RuntimeError(f"EML extraction error: {str(e)}")

    @staticmethod
    def extract_from_docx(file_content: bytes) -> str:
        """Extract text from DOCX"""
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_content))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        except Exception as e:
            # Fallback for when python-docx is not available
            return f"DOCX extraction requires python-docx: {str(e)}"

class ExcelProcessor:
    """Handle Excel file operations"""
    
    @staticmethod
    def read_excel(file_content_base64: str, sheet_name: Optional[str] = None) -> pd.DataFrame:
        """Read Excel file from base64"""
        file_bytes = base64.b64decode(file_content_base64)
        return pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name or 0)

    @staticmethod
    def get_sheet_names(file_content_base64: str) -> List[str]:
        """Get all sheet names from Excel file"""
        file_bytes = base64.b64decode(file_content_base64)
        xl_file = pd.ExcelFile(io.BytesIO(file_bytes))
        return xl_file.sheet_names

    @staticmethod
    def sum_column(df: pd.DataFrame, column_name: str) -> float:
        """Sum a column in DataFrame"""
        if column_name not in df.columns:
            raise ValueError(f"Column '{column_name}' not found. Available: {list(df.columns)}")
        return df[column_name].sum()

    @staticmethod
    def filter_rows(df: pd.DataFrame, column: str, condition: str, value: Any) -> pd.DataFrame:
        """Filter rows based on condition"""
        if condition == "equals":
            return df[df[column] == value]
        elif condition == "greater_than":
            return df[df[column] > value]
        elif condition == "less_than":
            return df[df[column] < value]
        elif condition == "contains":
            return df[df[column].astype(str).str.contains(str(value), na=False)]
        else:
            raise ValueError(f"Unknown condition: {condition}")

    @staticmethod
    def get_statistics(df: pd.DataFrame, column_name: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics for DataFrame or specific column"""
        if column_name:
            if column_name not in df.columns:
                raise ValueError(f"Column '{column_name}' not found")
            series = df[column_name]
            return {
                "count": int(series.count()),
                "mean": float(series.mean()) if pd.api.types.is_numeric_dtype(series) else None,
                "median": float(series.median()) if pd.api.types.is_numeric_dtype(series) else None,
                "std": float(series.std()) if pd.api.types.is_numeric_dtype(series) else None,
                "min": float(series.min()) if pd.api.types.is_numeric_dtype(series) else None,
                "max": float(series.max()) if pd.api.types.is_numeric_dtype(series) else None,
            }
        else:
            return {
                "shape": df.shape,
                "columns": list(df.columns),
                "dtypes": df.dtypes.astype(str).to_dict(),
                "numeric_columns": list(df.select_dtypes(include=['number']).columns),
            }

class CSVProcessor:
    """Handle CSV file operations"""
    
    @staticmethod
    def read_csv(file_content_base64: str) -> pd.DataFrame:
        """Read CSV file from base64"""
        file_bytes = base64.b64decode(file_content_base64)
        return pd.read_csv(io.BytesIO(file_bytes))

    @staticmethod
    def read_rows(df: pd.DataFrame, start_row: int = 0, end_row: Optional[int] = None) -> pd.DataFrame:
        """Read specific rows"""
        if end_row is None:
            return df.iloc[start_row:]
        return df.iloc[start_row:end_row]

    @staticmethod
    def sum_column(df: pd.DataFrame, column_name: str) -> float:
        """Sum a column"""
        if column_name not in df.columns:
            raise ValueError(f"Column '{column_name}' not found. Available: {list(df.columns)}")
        return df[column_name].sum()

    @staticmethod
    def filter_data(df: pd.DataFrame, column: str, condition: str, value: Any) -> pd.DataFrame:
        """Filter DataFrame based on condition"""
        return ExcelProcessor.filter_rows(df, column, condition, value)

    @staticmethod
    def group_by(df: pd.DataFrame, group_column: str, agg_column: str, agg_func: str = "sum") -> pd.DataFrame:
        """Group by operation"""
        if group_column not in df.columns or agg_column not in df.columns:
            raise ValueError(f"Column not found. Available: {list(df.columns)}")
        
        agg_funcs = {
            "sum": "sum",
            "mean": "mean",
            "count": "count",
            "min": "min",
            "max": "max"
        }
        
        if agg_func not in agg_funcs:
            raise ValueError(f"Unknown aggregation function: {agg_func}")
        
        return df.groupby(group_column)[agg_column].agg(agg_funcs[agg_func]).reset_index()

    @staticmethod
    def get_statistics(df: pd.DataFrame, column_name: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics"""
        return ExcelProcessor.get_statistics(df, column_name)

class PDFProcessor:
    """Handle PDF operations"""
    
    @staticmethod
    def extract_text(file_content_base64: str, page_range: Optional[str] = None) -> Dict[str, Any]:
        """Extract text from PDF with optional page range"""
        file_bytes = base64.b64decode(file_content_base64)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        try:
            # Use PyPDF2 to extract text
            reader = PdfReader(tmp_path)
            total_pages = len(reader.pages)

            # Parse page range
            if page_range and page_range.lower() != "all":
                if "-" in page_range:
                    start, end = map(int, page_range.split("-"))
                    # Ensure indices are within bounds
                    start_idx = max(0, start - 1)
                    end_idx = min(end, total_pages)
                    pages = range(start_idx, end_idx)
                else:
                    page_num = int(page_range) - 1
                    pages = range(max(0, page_num), min(page_num + 1, total_pages))
            else:
                pages = range(total_pages)

            text_by_page = {}
            for page_num in pages:
                page = reader.pages[page_num]
                try:
                    page_text = page.extract_text() or ""
                except Exception:
                    page_text = ""
                text_by_page[page_num + 1] = page_text

            os.unlink(tmp_path)

            return {
                "total_pages": total_pages,
                "extracted_pages": list(text_by_page.keys()),
                "text": "\n\n".join(text_by_page.values()),
                "text_by_page": text_by_page
            }
        except Exception as e:
            os.unlink(tmp_path)
            raise Exception(f"PDF processing error: {str(e)}")

    @staticmethod
    def extract_images(file_content_base64: str) -> List[Dict[str, Any]]:
        """Extract images from PDF"""
        file_bytes = base64.b64decode(file_content_base64)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        try:
            reader = PdfReader(tmp_path)
            images = PDFProcessor._extract_images_from_reader(reader)

            os.unlink(tmp_path)

            return images
        except Exception as e:
            os.unlink(tmp_path)
            raise RuntimeError(f"Image extraction error: {str(e)}")

    @staticmethod
    def _extract_images_from_reader(reader: PdfReader) -> List[Dict[str, Any]]:
        """Helper to extract images from a PdfReader object"""
        images: List[Dict[str, Any]] = []

        for page_num, page in enumerate(reader.pages):
            # Try to access XObject images in the page resources
            try:
                resources = page.get("/Resources") or {}
                xobject = resources.get("/XObject")
                if xobject:
                    xobject = xobject.get_object()
                else:
                    xobject = {}
            except Exception:
                xobject = {}

            if not isinstance(xobject, dict):
                # PyPDF2 sometimes returns indirect objects; try iterating keys
                try:
                    items = list(xobject.items())
                except Exception:
                    items = []
            else:
                items = list(xobject.items())

            for img_index, (obj_name, img_obj) in enumerate(items):
                try:
                    subtype = img_obj.get("/Subtype")
                    if subtype != "/Image":
                        continue

                    # Try to get raw image data
                    try:
                        image_data = img_obj.get_data()
                    except Exception:
                        image_data = getattr(img_obj, "_data", None)

                    if not image_data:
                        continue

                    # Determine image format from filter
                    img_filter = img_obj.get("/Filter")
                    if img_filter == "/DCTDecode":
                        ext = "jpg"
                    elif img_filter == "/JPXDecode":
                        ext = "jp2"
                    elif img_filter == "/FlateDecode":
                        ext = "png"
                    else:
                        ext = "bin"

                    images.append({
                        "page": page_num + 1,
                        "index": img_index,
                        "format": ext,
                        "size": len(image_data),
                        "image_base64": base64.b64encode(image_data).decode()
                    })
                except Exception:
                    # skip problematic image objects
                    continue

        return images

def detect_mime_type(filename: str) -> str:
    """Detect MIME type from filename"""
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"