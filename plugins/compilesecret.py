import re
import sys
import argparse
from vault import Vault


def read_file(file_path):
    with open(file_path, "r") as f:
        content = "".join(f.readlines())
    return content


def write_file(file_path, content):
    with open(file_path, "w") as f:
        f.write(content)

PATTERN = re.compile(r"\{(?P<app>(vault|file))\:(?P<path>[^\}]+)\}")

def compile_text(content):
    def replacement(x):
        app = x.group("app")
        path = x.group("path")
        if app == "vault":
            return Vault().read_secret_field(path)
        if app == "file":
            return read_file(path)
    return PATTERN.sub(replacement, content)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--output")
    args = parser.parse_args()

    content = read_file(args.input)
    compiled_content = compile_text(content)

    output = args.output
    if not output:
        print(compiled_content)
        return 

    write_file(output, compiled_content)



if __name__ == "__main__":
    main()
