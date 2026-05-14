import json
import re
import subprocess
import os
import time
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HAND_DIR = os.path.join(BASE_DIR, 'images', 'teacher', 'hand')
ANNOT_DIR = os.path.join(BASE_DIR, 'images', 'teacher', 'annot')
LARK_DOC_DIR = '/Users/zhengxiaoling/.claude/skills/lark-doc'
TEMP_HAND_DIR = os.path.join(LARK_DOC_DIR, 'downloads', 'hand')
TEMP_ANNOT_DIR = os.path.join(LARK_DOC_DIR, 'downloads', 'annot')

def clean_word_name(name):
    """Remove number prefix like '1.' '2.' from word name"""
    name = name.strip()
    # Match pattern like "1.南瓜" or "12.南瓜"
    match = re.match(r'^\d+\.\s*(.+)$', name)
    if match:
        return match.group(1)
    return name

def safe_filename(name):
    """Make filename safe for filesystem"""
    # Remove characters not suitable for filenames
    return re.sub(r'[\\/:*?"<>|]', '', name)

def download_image(token, output_path):
    """Download image using lark-cli to a relative path within its cwd"""
    cmd = [
        'lark-cli', 'docs', '+media-download',
        '--token', token,
        '--output', output_path
    ]
    try:
        result = subprocess.run(
            cmd,
            cwd=LARK_DOC_DIR,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            return True
        else:
            print(f"  Error downloading {token}: {result.stderr[:200]}")
            return False
    except Exception as e:
        print(f"  Exception downloading {token}: {e}")
        return False

def main():
    # Read document content
    with open('/tmp/doc_content.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    content = data['data']['document']['content']

    # Extract h3 headings and img tokens
    h3_pattern = re.compile(r'<h3>(.*?)</h3>')
    img_pattern = re.compile(r'<img[^>]*src="([^"]*)"[^>]*/>')

    h3_positions = [(m.start(), m.group(1)) for m in h3_pattern.finditer(content)]
    img_positions = [(m.start(), m.group(1)) for m in img_pattern.finditer(content)]

    # Build mapping
    word_groups = []
    for i in range(len(h3_positions)):
        h3_pos, h3_text = h3_positions[i]
        next_boundary = h3_positions[i+1][0] if i+1 < len(h3_positions) else len(content)

        # Find images between this h3 and next h3
        imgs = [src for pos, src in img_positions if h3_pos < pos < next_boundary]

        word_name = clean_word_name(h3_text)

        # Skip if no word name or less than 2 images
        if not word_name or len(imgs) < 2:
            continue

        word_groups.append({
            'name': word_name,
            'hand_token': imgs[0],
            'annot_token': imgs[1],
        })

    print(f"Found {len(word_groups)} valid word groups to download")

    # Ensure temp directories exist
    os.makedirs(TEMP_HAND_DIR, exist_ok=True)
    os.makedirs(TEMP_ANNOT_DIR, exist_ok=True)
    os.makedirs(HAND_DIR, exist_ok=True)
    os.makedirs(ANNOT_DIR, exist_ok=True)

    # Download
    success_count = 0
    fail_count = 0

    for idx, wg in enumerate(word_groups, 1):
        word_name = wg['name']
        safe_name = safe_filename(word_name)
        hand_token = wg['hand_token']
        annot_token = wg['annot_token']

        print(f"[{idx}/{len(word_groups)}] Downloading: {word_name}")

        # Download hand version
        final_hand_path = os.path.join(HAND_DIR, f"{safe_name}.png")
        if not os.path.exists(final_hand_path):
            temp_hand = os.path.join('downloads', 'hand', f"{safe_name}.png")
            if download_image(hand_token, temp_hand):
                # Move from temp to final location
                temp_full = os.path.join(LARK_DOC_DIR, temp_hand)
                if os.path.exists(temp_full):
                    shutil.move(temp_full, final_hand_path)
                    print(f"  ✓ Hand saved: {final_hand_path}")
                    success_count += 1
                else:
                    print(f"  ✗ Hand file not found after download")
                    fail_count += 1
            else:
                print(f"  ✗ Hand failed")
                fail_count += 1
        else:
            print(f"  ⏭ Hand already exists, skipping")

        # Download annot version
        final_annot_path = os.path.join(ANNOT_DIR, f"{safe_name}.png")
        if not os.path.exists(final_annot_path):
            temp_annot = os.path.join('downloads', 'annot', f"{safe_name}.png")
            if download_image(annot_token, temp_annot):
                temp_full = os.path.join(LARK_DOC_DIR, temp_annot)
                if os.path.exists(temp_full):
                    shutil.move(temp_full, final_annot_path)
                    print(f"  ✓ Annot saved: {final_annot_path}")
                    success_count += 1
                else:
                    print(f"  ✗ Annot file not found after download")
                    fail_count += 1
            else:
                print(f"  ✗ Annot failed")
                fail_count += 1
        else:
            print(f"  ⏭ Annot already exists, skipping")

        # Small delay to avoid rate limiting
        time.sleep(0.3)

    print(f"\nDone! Success: {success_count}, Failed: {fail_count}")

if __name__ == '__main__':
    main()
