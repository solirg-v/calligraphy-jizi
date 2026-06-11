#!/usr/bin/env python3
"""字体子集化：用 GB2312 全集（6763 字）+ 词库字 生成 WOFF2。

输入: tools/assets/荆霄鹏行楷.ttf
输出: public/fonts/jingxiaopeng.woff2

GB2312 覆盖 99% 日常常用字（含「妖、集、荆」等），文件约 2.4MB。

依赖:
  pip3 install --user fonttools brotli
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'tools/assets/荆霄鹏行楷.ttf')
OUT = os.path.join(ROOT, 'public/fonts/jingxiaopeng.woff2')
WORDS_JS = os.path.join(ROOT, 'shared/words.js')


def gb2312_hanzi():
    chars = set()
    for code in range(0xA1A1, 0xFEFF):
        high, low = code >> 8, code & 0xFF
        if high < 0xA1 or low < 0xA1:
            continue
        try:
            ch = bytes([high, low]).decode('gb2312')
            if len(ch) == 1 and 0x4e00 <= ord(ch) <= 0x9fff:
                chars.add(ch)
        except UnicodeDecodeError:
            pass
    return chars


def main():
    gb_chars = gb2312_hanzi()
    with open(WORDS_JS, encoding='utf-8') as f:
        word_chars = set(re.findall(r'[一-鿿]', f.read()))

    all_chars = gb_chars | word_chars
    print(f'GB2312: {len(gb_chars)}  词库: {len(word_chars)}  合并: {len(all_chars)}')

    txt_path = '/tmp/subset_chars.txt'
    with open(txt_path, 'w', encoding='utf-8') as f:
        for i in range(0x20, 0x7F):
            f.write(chr(i))
        for r in [(0x3000, 0x303F), (0xFF00, 0xFFEF), (0x2010, 0x2027)]:
            for i in range(r[0], r[1] + 1):
                f.write(chr(i))
        f.write(''.join(sorted(all_chars)))

    pyftsubset = os.path.expanduser('~/Library/Python/3.14/bin/pyftsubset')
    if not os.path.exists(pyftsubset):
        pyftsubset = 'pyftsubset'

    cmd = [
        pyftsubset, SRC,
        f'--text-file={txt_path}',
        f'--output-file={OUT}',
        '--flavor=woff2',
        '--no-hinting',
        '--desubroutinize',
        '--drop-tables+=DSIG,GPOS,GSUB,kern',
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print('错误:', result.stderr)
        sys.exit(1)

    size = os.path.getsize(OUT)
    print(f'完成。新字体: {size / 1024 / 1024:.2f} MB')


if __name__ == '__main__':
    main()
