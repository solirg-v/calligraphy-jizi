import os
import json
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HAND_DIR = os.path.join(BASE_DIR, 'images', 'teacher', 'hand')
ANNOT_DIR = os.path.join(BASE_DIR, 'images', 'teacher', 'annot')
OUTPUT = os.path.join(BASE_DIR, 'js', 'words.js')

def clean_word_name(name):
    """Keep only Chinese characters from filename"""
    # Remove file extension
    name = os.path.splitext(name)[0]
    # Keep only Chinese characters (CJK Unified Ideographs)
    cleaned = ''.join(ch for ch in name if '一' <= ch <= '鿿')
    return cleaned

def collect_words(directory):
    words = set()
    if not os.path.isdir(directory):
        return words
    for filename in os.listdir(directory):
        if filename.startswith('.'):
            continue
        name, ext = os.path.splitext(filename)
        if ext.lower() in ('.png', '.jpg', '.jpeg'):
            cleaned = clean_word_name(filename)
            if cleaned:
                words.add(cleaned)
    return words

hand_words = collect_words(HAND_DIR)
annot_words = collect_words(ANNOT_DIR)

# Union: any word that has either hand or annot image
all_words = sorted(hand_words | annot_words)

content = 'const WORDS = ' + json.dumps(all_words, ensure_ascii=False, separators=(',', ':')) + ';\n'

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Generated {OUTPUT} with {len(all_words)} words.')
if all_words:
    print('Words:', ', '.join(all_words))
