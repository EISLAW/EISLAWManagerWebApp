#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path
import sys
import urllib.request, urllib.parse


def load_secrets():
    sec_path = Path(__file__).resolve().parents[2] / 'secrets.local.json'
    if not sec_path.exists():
        raise FileNotFoundError(f'secrets.local.json not found at {sec_path}')
    return json.loads(sec_path.read_text(encoding='utf-8'))


def read(path):
    p = Path(path)
    return p.read_text(encoding='utf-8')


def build_prompt(system_prompt_path: Path, brief: str, transcript: str) -> dict:
    sys_text = system_prompt_path.read_text(encoding='utf-8')
    user_text = f"Brief:\n{brief}\n\nTranscript:\n{transcript}"
    return {
        'system': sys_text,
        'user': user_text,
    }


def call_openai(api_key: str, model: str, sys_text: str, user_text: str) -> str:
    url = 'https://api.openai.com/v1/chat/completions'
    body = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': sys_text},
            {'role': 'user', 'content': user_text},
        ],
        'temperature': 0.7,
    }
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        out = json.loads(resp.read().decode('utf-8'))
    return out['choices'][0]['message']['content'].strip()


def call_anthropic(api_key: str, model: str, sys_text: str, user_text: str) -> str:
    url = 'https://api.anthropic.com/v1/messages'
    body = {
        'model': model,
        'max_tokens': 1200,
        'system': sys_text,
        'messages': [{'role': 'user', 'content': user_text}],
    }
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        out = json.loads(resp.read().decode('utf-8'))
    return ''.join([p.get('text','') for p in out['content']]).strip()


def call_gemini(api_key: str, model: str, sys_text: str, user_text: str) -> str:
    # Gemini generateContent
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model)}:generateContent?key={urllib.parse.quote(api_key)}'
    body = {
        'system_instruction': {'parts': [{'text': sys_text}]},
        'contents': [{'parts': [{'text': user_text}]}],
        'generationConfig': {'temperature': 0.7, 'topP': 0.9}
    }
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        out = json.loads(resp.read().decode('utf-8'))
    parts = out.get('candidates', [{}])[0].get('content', {}).get('parts', [])
    return ''.join([p.get('text','') for p in parts]).strip()


def main():
    ap = argparse.ArgumentParser(description='MarketingAgent — First‑Person Storytelling Composer')
    ap.add_argument('--transcript', required=True, help='Path to transcript text file')
    ap.add_argument('--brief', required=True, help='Short request: goal + audience + channel (email/post/etc.)')
    ap.add_argument('--prompt', help='Path to a custom system prompt file (e.g., viral storytelling)')
    ap.add_argument('--provider', choices=['openai','anthropic','gemini'], help='Override provider from secrets')
    ap.add_argument('--model', help='Model name override')
    args = ap.parse_args()

    transcript = read(args.transcript)
    prompt_path = Path(args.prompt) if args.prompt else (Path(__file__).resolve().parent / 'prompt_marketing_agent.txt')
    combo = build_prompt(prompt_path, args.brief, transcript)

    sec = load_secrets()
    provider = args.provider or (sec.get('llm',{}).get('provider') or 'gemini')
    keys = sec.get('llm',{}).get('api_keys',{})

    if provider == 'openai':
        api_key = keys.get('openai') or os.environ.get('OPENAI_API_KEY')
        model = args.model or 'gpt-4o-mini'
        if not api_key:
            print('Missing OpenAI key', file=sys.stderr); sys.exit(2)
        out = call_openai(api_key, model, combo['system'], combo['user'])
    elif provider == 'anthropic':
        api_key = keys.get('anthropic') or os.environ.get('ANTHROPIC_API_KEY')
        model = args.model or 'claude-3-5-sonnet-latest'
        if not api_key:
            print('Missing Anthropic key', file=sys.stderr); sys.exit(2)
        out = call_anthropic(api_key, model, combo['system'], combo['user'])
    else:
        api_key = keys.get('gemini') or os.environ.get('GEMINI_API_KEY')
        model = args.model or 'models/gemini-2.0-flash'
        if not api_key:
            print('Missing Gemini key', file=sys.stderr); sys.exit(2)
        out = call_gemini(api_key, model, combo['system'], combo['user'])

    print(out)


if __name__ == '__main__':
    main()
