import os
import random
import shutil
import string

from bs4 import BeautifulSoup
from jinja2 import Environment, FileSystemLoader
from markdown import markdown


def random_string(length=12):
    chars = string.ascii_lowercase + string.digits  # a-z and 0-9
    return "".join(random.choices(chars, k=length))


def immediate_subdirs(root_dir):
    return [name for name in os.listdir(root_dir) if os.path.isdir(os.path.join(root_dir, name))]


def copy_assets():
    copied_dirs = []
    for dir in immediate_subdirs("content"):
        random_id = random_string()
        # Copy assets from the content directory to the build directory
        src_dir = os.path.join("content", dir)
        dst_dir = os.path.join("build", random_id)
        os.makedirs(dst_dir)
        for filename in os.listdir(src_dir):
            src_file = os.path.join(src_dir, filename)
            dst_file = os.path.join(dst_dir, filename)
            if os.path.isfile(src_file):
                shutil.copy2(src_file, dst_file)  # copy2 preserves metadata
        copied_dirs.append((dir, random_id))
    return copied_dirs


def make_page(page_template, html_content):
    # Extract h1
    soup = BeautifulSoup(html_content, "html.parser")

    # Find all <h1> elements
    h1_tags = soup.find_all("h1")

    assert len(h1_tags) < 2, "More than one <h1> found in the content"
    assert len(h1_tags) == 1, "No <h1> found in the content"
    title = h1_tags[0].text.strip()

    output = page_template.render(title=title, content=html_content)
    return output, title


def make_pages(page_template):
    pages = [f[:-3] for f in os.listdir("content") if f.endswith(".md")]

    generated_pages = []
    for id in pages:
        with open(f"content/{id}.md", "r", encoding="utf-8") as f:
            md_content = f.read()
        page_html_content = markdown(md_content)
        output, title = make_page(page_template, page_html_content)
        random_id = random_string()
        with open(f"build/{random_id}.html", "w", encoding="utf-8") as f:
            f.write(output)
        generated_pages.append((id, random_id, title))
    return generated_pages


def make_homepage(jinja2_env, page_template, generated_pages):
    home_template = jinja2_env.get_template("home.html")
    home_html = home_template.render(pages=[(id, title) for id, _, title in generated_pages])
    output, _ = make_page(page_template, home_html)
    random_id = random_string()
    with open(f"build/{random_id}.html", "w", encoding="utf-8") as f:
        f.write(output)
    return random_id


def make_htaccess(generated_pages, copied_dirs, homepage_id):
    with open("build/.htaccess", "w", encoding="utf-8") as f:
        f.write(f"DirectoryIndex {homepage_id}.html\n")
        f.write("\n")
        f.write("RewriteEngine On\n")
        for id, secret_id, _ in generated_pages:
            f.write(f"RewriteRule ^{id}$ /{secret_id}.html [L]\n")
        for dir, random_id in copied_dirs:
            f.write(f"RewriteRule ^{dir}/(.*)$ /{random_id}/$1 [L]\n")


def run():
    assert not os.path.exists("build"), "Build directory already exists. Please remove it first."
    env = Environment(loader=FileSystemLoader("templates"))
    page_template = env.get_template("page.html")
    os.makedirs("build")
    generated_pages = make_pages(page_template)
    homepage_id = make_homepage(env, page_template, generated_pages)
    copied_dirs = copy_assets()
    make_htaccess(generated_pages, copied_dirs, homepage_id)


if __name__ == "__main__":
    run()
