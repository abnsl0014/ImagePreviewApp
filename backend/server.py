from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import uuid
import tempfile
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Temp storage for uploaded images
TEMP_DIR = tempfile.mkdtemp()
image_store = {}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

FORMAT_MAP = {
    "png": "PNG",
    "jpeg": "JPEG",
    "jpg": "JPEG",
    "webp": "WEBP",
    "gif": "GIF",
    "bmp": "BMP",
    "tiff": "TIFF",
}

MIME_MAP = {
    "PNG": "image/png",
    "JPEG": "image/jpeg",
    "WEBP": "image/webp",
    "GIF": "image/gif",
    "BMP": "image/bmp",
    "TIFF": "image/tiff",
}


class ImageInfo(BaseModel):
    id: str
    filename: str
    width: int
    height: int
    file_size: int
    format: str
    mode: str


class ExportRequest(BaseModel):
    image_id: str
    format: str = "png"
    quality: int = 85
    width: Optional[int] = None
    height: Optional[int] = None
    maintain_aspect: bool = True


def get_image_info(img: Image.Image, file_size: int, filename: str, image_id: str) -> dict:
    fmt = img.format or "UNKNOWN"
    return {
        "id": image_id,
        "filename": filename,
        "width": img.width,
        "height": img.height,
        "file_size": file_size,
        "format": fmt.upper(),
        "mode": img.mode,
    }


@api_router.get("/")
async def root():
    return {"message": "PixelPerfect API"}


@api_router.post("/image/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    file_size = len(contents)

    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 50MB.")

    try:
        img = Image.open(io.BytesIO(contents))
        img.load()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    image_id = str(uuid.uuid4())
    file_path = os.path.join(TEMP_DIR, f"{image_id}.dat")
    with open(file_path, "wb") as f:
        f.write(contents)

    image_store[image_id] = {
        "path": file_path,
        "filename": file.filename,
        "format": img.format,
        "size": file_size,
    }

    info = get_image_info(img, file_size, file.filename, image_id)
    img.close()

    return info


@api_router.get("/image/preview/{image_id}")
async def preview_image(image_id: str):
    if image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")

    stored = image_store[image_id]
    with open(stored["path"], "rb") as f:
        contents = f.read()

    fmt = stored["format"] or "PNG"
    mime = MIME_MAP.get(fmt.upper(), "image/png")

    return StreamingResponse(io.BytesIO(contents), media_type=mime)


@api_router.post("/image/export")
async def export_image(
    image_id: str = Form(...),
    format: str = Form("png"),
    quality: int = Form(85),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    maintain_aspect: bool = Form(True),
):
    if image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")

    stored = image_store[image_id]
    with open(stored["path"], "rb") as f:
        contents = f.read()

    try:
        img = Image.open(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to process image")

    # Resize if dimensions provided
    if width or height:
        orig_w, orig_h = img.size
        if maintain_aspect:
            if width and not height:
                ratio = width / orig_w
                height = int(orig_h * ratio)
            elif height and not width:
                ratio = height / orig_h
                width = int(orig_w * ratio)
            elif width and height:
                ratio = min(width / orig_w, height / orig_h)
                width = int(orig_w * ratio)
                height = int(orig_h * ratio)
        else:
            width = width or orig_w
            height = height or orig_h

        img = img.resize((width, height), Image.Resampling.LANCZOS)

    # Convert format
    target_format = FORMAT_MAP.get(format.lower(), "PNG")
    output = io.BytesIO()

    save_kwargs = {}
    if target_format == "JPEG":
        if img.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = bg
        save_kwargs["quality"] = max(1, min(100, quality))
        save_kwargs["optimize"] = True
    elif target_format == "WEBP":
        save_kwargs["quality"] = max(1, min(100, quality))
        save_kwargs["method"] = 4
    elif target_format == "PNG":
        save_kwargs["optimize"] = True

    img.save(output, format=target_format, **save_kwargs)
    output.seek(0)
    export_size = output.getbuffer().nbytes

    ext = format.lower()
    if ext == "jpeg":
        ext = "jpg"
    original_name = Path(stored["filename"]).stem
    export_filename = f"{original_name}_exported.{ext}"

    mime = MIME_MAP.get(target_format, "application/octet-stream")
    img.close()

    headers = {
        "Content-Disposition": f'attachment; filename="{export_filename}"',
        "X-Export-Size": str(export_size),
        "X-Export-Width": str(width or img.width if hasattr(img, 'width') else 0),
        "X-Export-Height": str(height or img.height if hasattr(img, 'height') else 0),
    }

    return StreamingResponse(output, media_type=mime, headers=headers)


@api_router.post("/image/batch-export")
async def batch_export(
    image_id: str = Form(...),
    formats: str = Form("png,jpeg,webp"),
    quality: int = Form(85),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    maintain_aspect: bool = Form(True),
):
    """Export image in multiple formats at once. Returns info about each export."""
    if image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")

    format_list = [f.strip().lower() for f in formats.split(",")]
    results = []

    stored = image_store[image_id]
    with open(stored["path"], "rb") as f:
        contents = f.read()

    for fmt in format_list:
        try:
            img = Image.open(io.BytesIO(contents))
            target_format = FORMAT_MAP.get(fmt, "PNG")

            if width or height:
                orig_w, orig_h = img.size
                rw, rh = width, height
                if maintain_aspect:
                    if rw and not rh:
                        ratio = rw / orig_w
                        rh = int(orig_h * ratio)
                    elif rh and not rw:
                        ratio = rh / orig_h
                        rw = int(orig_w * ratio)
                    elif rw and rh:
                        ratio = min(rw / orig_w, rh / orig_h)
                        rw = int(orig_w * ratio)
                        rh = int(orig_h * ratio)
                else:
                    rw = rw or orig_w
                    rh = rh or orig_h
                img = img.resize((rw, rh), Image.Resampling.LANCZOS)

            output = io.BytesIO()
            save_kwargs = {}

            if target_format == "JPEG":
                if img.mode in ("RGBA", "LA", "P"):
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                    img = bg
                save_kwargs["quality"] = quality
            elif target_format == "WEBP":
                save_kwargs["quality"] = quality

            img.save(output, format=target_format, **save_kwargs)
            export_size = output.getbuffer().nbytes

            results.append({
                "format": fmt,
                "size": export_size,
                "width": img.width,
                "height": img.height,
                "success": True,
            })
            img.close()
        except Exception as e:
            results.append({"format": fmt, "success": False, "error": str(e)})

    return {"results": results}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Export-Size", "X-Export-Width", "X-Export-Height", "Content-Disposition"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    # Clean up temp files
    import shutil
    try:
        shutil.rmtree(TEMP_DIR, ignore_errors=True)
    except Exception:
        pass
