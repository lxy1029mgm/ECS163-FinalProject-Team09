## Description 
- Clearly describe the repository components and structures in a few paragraphs
- ## Repository Structure
```text
ECS163-FinalProject-Team09/
├── index.html                  #  # Main webpage entry point; right-click this file and select "Open with Live Server" to run the project locally
├── continents2.csv             # continent-related data
├── extinction.csv              # extinction dataset
├── local-image-map.js          # Mapping file for local image paths
├── species-image-map.js        # Mapping file for species image paths
│
├── config/                     # Configuration files for shared visualization settings
│   ├── global_config.js
│   └── map_config.js
│
├── images/                     # Image files used by the visualization
│
├── js/                         # JavaScript files for interaction and visualization
│   ├── bubble.js
│   ├── cross_graph.js
│   ├── map.js
│   ├── sankey.js
│   └── timeline.js
│
├── sankey_local/               # Sankey-related files
│   ├── images/
│   ├── vendor/
│   ├── index.html
│   ├── local-image-map.js
│   ├── main.js
│   └── merged_cleaned_with_clean_lab...
│
└── vendor/                     # JavaScript libraries
    ├── d3.v5.min.js
    └── d3-sankey.min.js
```

## Installation 
To run this project locally, ensure you have a modern web browser and a local development environment installed.

Code Editor: Visual Studio Code (VS Code) is recommended.  
VS Code Extension: Install Live Server by Ritwick Dey, from the VS Code Extension Marketplace.

Download the ZIP archive to your local environment, or clone the repository using Git with the following command on your terminal:

```bash
git clone https://github.com/lxy1029mgm/ECS163-FinalProject-Team09.git
cd ECS163-FinalProject-Team09
```

Please keep all downloaded project files in the same folder structure as the repository. The image assets and frontend files need to stay in their original relative locations so that the webpage can load images and other resources correctly.

## Execution 
- How to run a demo on your code, including running data preprocessing scripts and frontend scripts.

Launch VS Code.  
Open the cloned project folder (`ECS163-FinalProject-Team09`) in the editor space via `File > Open Folder`.  
Navigate through the file tree and find `index.html`.  
Right-click on `index.html`, select `Open with Live Server`.  
A local development environment port will open up automatically in your default internet browser, typically:

```text
http://127.0.0.1:5500/index.html
```

Interactive features to explore:  
Sequential Narrative Scroll:

Make sure the project is opened from the repository root folder instead of opening `index.html` alone from another location. This helps the browser correctly find linked CSS, JavaScript, data, and image files during the demo.
