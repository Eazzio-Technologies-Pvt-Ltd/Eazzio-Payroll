import os
import re

# Setup paths relative to the current workspace configuration
search_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app'))
components_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'components'))

def replace_in_dir(directory):
    if not os.path.exists(directory):
        print(f"Skipping non-existent directory: {directory}")
        return
        
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace pixel-based border radius but ignore 50% for circular elements
                new_content = re.sub(r'borderRadius:\s*"[0-9]+px"', 'borderRadius: "0"', content)
                new_content = re.sub(r'borderRadius:\s*\'[0-9]+px\'', 'borderRadius: "0"', new_content)
                # Remove gradients
                new_content = re.sub(r'background:\s*"linear-gradient\([^)]+\)"', 'background: "var(--accent-blue)"', new_content)
                new_content = re.sub(r'background:\s*\'linear-gradient\([^)]+\)\'', 'background: "var(--accent-blue)"', new_content)

                if content != new_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f'Updated {file}')

if __name__ == '__main__':
    print(f"Searching and optimizing radius in: {search_dir}")
    replace_in_dir(search_dir)
    print(f"Searching and optimizing radius in: {components_dir}")
    replace_in_dir(components_dir)
    print("Optimization completed!")
