from fastapi import APIRouter, HTTPException
from models.schemas import (
    AttachmentQueryRequest, ExcelOperationRequest,
    CSVOperationRequest, PDFExtractRequest
)
from routers.utils import (
    ExcelProcessor, CSVProcessor, PDFProcessor, FileProcessor
)
from services.gemini_service import GeminiService
import base64

router = APIRouter(prefix="/attachments", tags=["Attachments"])

# Initialize Gemini service
try:
    gemini_service = GeminiService()
except Exception as e:
    print(f"Warning: Failed to initialize Gemini service: {e}")
    gemini_service = None

@router.post("/query")
async def query_attachment(request: AttachmentQueryRequest):
    """
    Ask questions about attachment content using AI
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    try:
        # Decode file content
        if request.file_content_base64:
            file_bytes = base64.b64decode(request.file_content_base64)
            content = FileProcessor.extract_text_from_file(file_bytes, request.filename)
        else:
            raise HTTPException(status_code=400, detail="file_content_base64 is required")
        
        # Query with Gemini
        answer = gemini_service.query_attachment_content(
            request.filename,
            content,
            request.query
        )
        
        return {
            "success": True,
            "filename": request.filename,
            "query": request.query,
            "answer": answer
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")

@router.post("/excel-operations")
async def excel_operations(request: ExcelOperationRequest):
    """
    Perform operations on Excel files
    Supported operations: read_sheet, sum_column, filter_rows, get_cell, statistics, list_sheets
    """
    try:
        operation = request.operation.lower()
        params = request.parameters
        
        if operation == "list_sheets":
            sheets = ExcelProcessor.get_sheet_names(request.file_content_base64)
            return {
                "success": True,
                "operation": operation,
                "result": {"sheets": sheets}
            }
        
        # Read the Excel file
        sheet_name = params.get("sheet_name")
        df = ExcelProcessor.read_excel(request.file_content_base64, sheet_name)
        
        result = {}
        
        if operation == "read_sheet":
            # Return first N rows
            n_rows = params.get("n_rows", 10)
            result = {
                "shape": df.shape,
                "columns": list(df.columns),
                "data": df.head(n_rows).to_dict(orient="records"),
                "preview": df.head(n_rows).to_string()
            }
        
        elif operation == "sum_column":
            column_name = params.get("column_name")
            if not column_name:
                raise HTTPException(status_code=400, detail="column_name parameter required")
            
            total = ExcelProcessor.sum_column(df, column_name)
            result = {
                "column": column_name,
                "sum": float(total),
                "count": int(df[column_name].count())
            }
        
        elif operation == "filter_rows":
            column = params.get("column")
            condition = params.get("condition")  # equals, greater_than, less_than, contains
            value = params.get("value")
            
            if not all([column, condition, value]):
                raise HTTPException(
                    status_code=400,
                    detail="column, condition, and value parameters required"
                )
            
            filtered_df = ExcelProcessor.filter_rows(df, column, condition, value)
            result = {
                "original_rows": len(df),
                "filtered_rows": len(filtered_df),
                "data": filtered_df.to_dict(orient="records"),
                "preview": filtered_df.head(10).to_string()
            }
        
        elif operation == "statistics":
            column_name = params.get("column_name")
            stats = ExcelProcessor.get_statistics(df, column_name)
            result = stats
        
        elif operation == "get_cell":
            row = params.get("row")
            column = params.get("column")
            
            if row is None or column is None:
                raise HTTPException(status_code=400, detail="row and column parameters required")
            
            value = df.iloc[row][column]
            result = {
                "row": row,
                "column": column,
                "value": str(value)
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown operation: {operation}")
        
        # Add AI insights if Gemini is available
        if gemini_service and operation in ["read_sheet", "filter_rows", "statistics"]:
            preview = str(result)[:2000]
            insights = gemini_service.analyze_data_operation(preview, operation, params)
            result["ai_insights"] = insights
        
        return {
            "success": True,
            "filename": request.filename,
            "operation": operation,
            "result": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel operation error: {str(e)}")

@router.post("/csv-operations")
async def csv_operations(request: CSVOperationRequest):
    """
    Perform operations on CSV files
    Supported operations: read_rows, sum_column, filter, statistics, group_by
    """
    try:
        operation = request.operation.lower()
        params = request.parameters
        
        # Read the CSV file
        df = CSVProcessor.read_csv(request.file_content_base64)
        
        result = {}
        
        if operation == "read_rows":
            start_row = params.get("start_row", 0)
            end_row = params.get("end_row")
            
            subset_df = CSVProcessor.read_rows(df, start_row, end_row)
            result = {
                "total_rows": len(df),
                "returned_rows": len(subset_df),
                "columns": list(df.columns),
                "data": subset_df.to_dict(orient="records"),
                "preview": subset_df.to_string()
            }
        
        elif operation == "sum_column":
            column_name = params.get("column_name")
            if not column_name:
                raise HTTPException(status_code=400, detail="column_name parameter required")
            
            total = CSVProcessor.sum_column(df, column_name)
            result = {
                "column": column_name,
                "sum": float(total),
                "count": int(df[column_name].count())
            }
        
        elif operation == "filter":
            column = params.get("column")
            condition = params.get("condition")
            value = params.get("value")
            
            if not all([column, condition, value]):
                raise HTTPException(
                    status_code=400,
                    detail="column, condition, and value parameters required"
                )
            
            filtered_df = CSVProcessor.filter_data(df, column, condition, value)
            result = {
                "original_rows": len(df),
                "filtered_rows": len(filtered_df),
                "data": filtered_df.to_dict(orient="records"),
                "preview": filtered_df.head(10).to_string()
            }
        
        elif operation == "statistics":
            column_name = params.get("column_name")
            stats = CSVProcessor.get_statistics(df, column_name)
            result = stats
        
        elif operation == "group_by":
            group_column = params.get("group_column")
            agg_column = params.get("agg_column")
            agg_func = params.get("agg_func", "sum")
            
            if not all([group_column, agg_column]):
                raise HTTPException(
                    status_code=400,
                    detail="group_column and agg_column parameters required"
                )
            
            grouped_df = CSVProcessor.group_by(df, group_column, agg_column, agg_func)
            result = {
                "groups": len(grouped_df),
                "data": grouped_df.to_dict(orient="records"),
                "preview": grouped_df.to_string()
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown operation: {operation}")
        
        # Add AI insights if Gemini is available
        if gemini_service and operation in ["read_rows", "filter", "statistics", "group_by"]:
            preview = str(result)[:2000]
            insights = gemini_service.analyze_data_operation(preview, operation, params)
            result["ai_insights"] = insights
        
        return {
            "success": True,
            "filename": request.filename,
            "operation": operation,
            "result": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV operation error: {str(e)}")

@router.post("/pdf-extract")
async def pdf_extract(request: PDFExtractRequest):
    """
    Extract text and optionally images from PDF
    """
    try:
        # Extract text
        text_result = PDFProcessor.extract_text(
            request.file_content_base64,
            request.page_range
        )
        
        result = {
            "filename": request.filename,
            "total_pages": text_result["total_pages"],
            "extracted_pages": text_result["extracted_pages"],
            "text": text_result["text"],
            "text_by_page": text_result["text_by_page"]
        }
        
        # Extract images if requested
        if request.extract_images:
            images = PDFProcessor.extract_images(request.file_content_base64)
            result["images"] = images
            result["image_count"] = len(images)
        
        # Add AI summary if Gemini is available
        if gemini_service:
            summary_prompt = f"Summarize this PDF content in 2-3 sentences:\n\n{text_result['text'][:3000]}"
            summary = gemini_service.chat_with_context(
                [{"role": "user", "content": summary_prompt}]
            )
            result["ai_summary"] = summary
        
        return {
            "success": True,
            "result": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction error: {str(e)}")

@router.post("/smart-query")
async def smart_query(request: AttachmentQueryRequest):
    """
    Intelligent query that automatically detects file type and performs appropriate operations
    Examples:
    - "What's the sum of the sales column?"
    - "Show me rows where status is 'completed'"
    - "Summarize this document"
    - "Extract text from page 3"
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    try:
        # Decode file
        file_bytes = base64.b64decode(request.file_content_base64)
        filename = request.filename.lower()
        
        # Detect file type and handle accordingly
        if filename.endswith(('.xlsx', '.xls')):
            # Excel file - let AI determine the operation
            df = ExcelProcessor.read_excel(request.file_content_base64)
            data_preview = df.head(20).to_string()
            
            analysis_prompt = f"""The user asked: "{request.query}"
            
Here's a preview of the Excel data:
{data_preview}

Columns: {list(df.columns)}

Please answer the user's question based on this data. If they're asking for calculations, perform them.
If they're asking to see specific data, format it clearly."""
            
            response = gemini_service.chat_with_context([
                {"role": "user", "content": analysis_prompt}
            ])
            
            return {
                "success": True,
                "filename": request.filename,
                "file_type": "excel",
                "query": request.query,
                "answer": response,
                "data_preview": data_preview
            }
        
        elif filename.endswith('.csv'):
            # CSV file
            df = CSVProcessor.read_csv(request.file_content_base64)
            data_preview = df.head(20).to_string()
            
            analysis_prompt = f"""The user asked: "{request.query}"
            
Here's a preview of the CSV data:
{data_preview}

Columns: {list(df.columns)}

Please answer the user's question based on this data."""
            
            response = gemini_service.chat_with_context([
                {"role": "user", "content": analysis_prompt}
            ])
            
            return {
                "success": True,
                "filename": request.filename,
                "file_type": "csv",
                "query": request.query,
                "answer": response,
                "data_preview": data_preview
            }
        
        else:
            # Other files - extract text and query
            content = FileProcessor.extract_text_from_file(file_bytes, request.filename)
            answer = gemini_service.query_attachment_content(
                request.filename,
                content,
                request.query
            )
            
            return {
                "success": True,
                "filename": request.filename,
                "file_type": "text_based",
                "query": request.query,
                "answer": answer
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart query error: {str(e)}")