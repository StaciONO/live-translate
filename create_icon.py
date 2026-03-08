from PIL import Image, ImageDraw, ImageFont
import os

size = 1024
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Rounded rectangle background with gradient simulation
for y in range(size):
    for x in range(size):
        # Check if inside rounded rect
        r = 200
        inside = True
        if x < r and y < r:
            inside = (x - r) ** 2 + (y - r) ** 2 <= r ** 2
        elif x > size - r and y < r:
            inside = (x - (size - r)) ** 2 + (y - r) ** 2 <= r ** 2
        elif x < r and y > size - r:
            inside = (x - r) ** 2 + (y - (size - r)) ** 2 <= r ** 2
        elif x > size - r and y > size - r:
            inside = (x - (size - r)) ** 2 + (y - (size - r)) ** 2 <= r ** 2

        if inside:
            t = (x + y) / (2 * size)
            cr = int(108 * (1 - t) + 167 * t)
            cg = int(99 * (1 - t) + 139 * t)
            cb = int(255 * (1 - t) + 250 * t)
            img.putpixel((x, y), (cr, cg, cb, 255))

draw = ImageDraw.Draw(img)

# Microphone body (ellipse)
cx, cy = 512, 380
mw, mh = 100, 160
draw.ellipse([cx - mw, cy - mh, cx + mw, cy + mh], fill='white')

# Mic arc
arc_r = 180
draw.arc([cx - arc_r, cy - 20, cx + arc_r, cy + arc_r * 2 - 20], 0, 180, fill='white', width=36)

# Mic stand
draw.line([cx, cy + arc_r * 2 - 20, cx, cy + arc_r * 2 + 100], fill='white', width=36)

# Base line
draw.line([cx - 80, cy + arc_r * 2 + 100, cx + 80, cy + arc_r * 2 + 100], fill='white', width=36)

# Sound waves
wave_cx = cx + 160
wave_cy = cy + 30
for i in range(3):
    wr = 100 + i * 65
    bbox = [wave_cx - wr, wave_cy - wr, wave_cx + wr, wave_cy + wr]
    draw.arc(bbox, -40, 40, fill=(255, 255, 255, 160), width=24)

# Save as PNG
img.save('icon.png')
print('icon.png created!')

# Create .icns for macOS
iconset_dir = 'LiveTranslate.iconset'
os.makedirs(iconset_dir, exist_ok=True)

sizes = [16, 32, 64, 128, 256, 512, 1024]
for s in sizes:
    resized = img.resize((s, s), Image.LANCZOS)
    resized.save(f'{iconset_dir}/icon_{s}x{s}.png')
    if s <= 512:
        resized2x = img.resize((s * 2, s * 2), Image.LANCZOS)
        resized2x.save(f'{iconset_dir}/icon_{s}x{s}@2x.png')

print('Iconset created!')
