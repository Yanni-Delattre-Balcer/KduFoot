import sys
from PIL import Image

def analyze_image(path):
    print(f"Analyzing {path}...")
    try:
        img = Image.open(path).convert('RGBA')
        width, height = img.size
        print(f"Size: {width}x{height}")
        
        profile = []
        for y in range(height):
            alpha_sum = sum(img.getpixel((x, y))[3] for x in range(width))
            profile.append((y, alpha_sum))
        
        ranges = []
        in_content = False
        start = 0
        for y, alpha in profile:
            if alpha > 0 and not in_content:
                in_content = True
                start = y
            elif alpha == 0 and in_content:
                in_content = False
                ranges.append((start, y-1))
        if in_content:
            ranges.append((start, height-1))
        
        print("Y ranges of content:", ranges)
        
        # also find X ranges to see if the K is centered
        x_profile = [sum(img.getpixel((x, y))[3] for y in range(height)) for x in range(width)]
        x_ranges = []
        in_content = False
        start = 0
        for x, alpha in enumerate(x_profile):
            if alpha > 0 and not in_content:
                in_content = True
                start = x
            elif alpha == 0 and in_content:
                in_content = False
                x_ranges.append((start, x-1))
        if in_content:
            x_ranges.append((start, width-1))
        print("X ranges of content:", x_ranges)
    except Exception as e:
        print(f"Error analyzing {path}: {e}")

analyze_image('apps/client/public/logo.png')
