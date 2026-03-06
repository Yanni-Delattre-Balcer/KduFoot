import sys
import os
from PIL import Image

def process_logo(base_path):
    src_logo = os.path.join(base_path, 'logo.png')
    if not os.path.exists(src_logo):
        print(f"Error: {src_logo} not found")
        return
    
    print("Opening logo...")
    img = Image.open(src_logo).convert('RGBA')
    
    # We found earlier:
    # X ranges of content: [(176, 848)]  -> Width: 673
    # Y ranges of top part: [(68, 727)] -> Height: 660
    # Let's crop a secure square around center (512, 398) with radius 360
    # Box: (512 - 360, 398 - 360, 512 + 360, 398 + 360) = (152, 38, 872, 758)
    
    # Actually, we can just crop dynamically to the top graphic
    # Let's recalculate and find bounding box of the top cluster
    # (Y from 0 to 750)
    top_img = img.crop((0, 0, img.width, 750))
    bbox = top_img.getbbox()
    
    if not bbox:
        print("Could not find top cluster!")
        return
        
    print(f"Top cluster bounding box: {bbox}")
    
    # Create square box
    center_x = (bbox[0] + bbox[2]) // 2
    center_y = (bbox[1] + bbox[3]) // 2
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    
    side = max(width, height)
    # Add a little padding, say 10%
    r = int((side / 2) * 1.05)
    
    crop_box = (
        max(0, center_x - r),
        max(0, center_y - r),
        min(img.width, center_x + r),
        min(img.height, center_y + r)
    )
    
    # Crop to make it square
    # First, make an empty square image transparent
    sq_size = r * 2
    square_img = Image.new('RGBA', (sq_size, sq_size), (0, 0, 0, 0))
    
    # Paste cropped area
    cropped_region = img.crop(crop_box)
    
    # Center paste in square
    paste_x = (sq_size - cropped_region.width) // 2
    paste_y = (sq_size - cropped_region.height) // 2
    square_img.paste(cropped_region, (paste_x, paste_y))
    
    print(f"Cropped to square size: {square_img.size}")
    
    # Now generate and overwrite files
    files = {
        'logo.png': 1024,
        'android-chrome-512x512.png': 512,
        'android-chrome-192x192.png': 192,
        'apple-touch-icon.png': 180,
        'favicon-32x32.png': 32,
        'favicon-16x16.png': 16
    }
    
    for filename, size in files.items():
        out_path = os.path.join(base_path, filename)
        if os.path.exists(out_path):
            resized = square_img.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(out_path, format='PNG')
            print(f"Overwrote {out_path} ({size}x{size})")

process_logo("apps/client/public")
