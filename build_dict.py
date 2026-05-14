import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HAND_DIR = os.path.join(BASE_DIR, 'images', 'teacher', 'hand')
ANNOT_DIR = os.path.join(BASE_DIR, 'images', 'teacher', 'annot')
OUTPUT = os.path.join(BASE_DIR, 'js', 'words.js')

def collect_words(directory):
    words = set()
    if not os.path.isdir(directory):
        return words
    for filename in os.listdir(directory):
        name, ext = os.path.splitext(filename)
        if ext.lower() in ('.png', '.jpg', '.jpeg'):
            words.add(name)
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
