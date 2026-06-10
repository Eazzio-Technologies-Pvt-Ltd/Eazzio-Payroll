import os
import re

search_dir = r'c:\Users\Hp\Documents\VS code programs\FeildForceManagement\Field_Force_Mnt_Sys\frontend\app'
components_dir = r'c:\Users\Hp\Documents\VS code programs\FeildForceManagement\Field_Force_Mnt_Sys\frontend\components'

def replace_in_dir(directory):
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

replace_in_dir(search_dir)
replace_in_dir(components_dir)
