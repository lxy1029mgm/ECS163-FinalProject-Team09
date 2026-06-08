## Description 
- ## Repository Structure
```text
ECS163-FinalProject-Team09/
├── index.html                  #  # Main webpage entry point; right-click this file and select "Open with Live Server" to run the project locally
├── continents2.csv             # continent-related data
├── extinction.csv              # extinction dataset
├── local-image-map.js          # Mapping file for local image paths
├── species-image-map.js        # Mapping file for species image paths
├── start.bat
│
├── config/                     # Configuration files for shared visualization settings
│   ├── global_config.js
│   └── map_config.js
│
├── images/                     # Image files used by the visualization
│
├── js/                         # JavaScript files for interaction and visualization
│   ├── bubble.js               # bubble graph for cause
│   ├── cross_graph.js          #cross graph interaction
│   ├── map.js                  # map for geographic distribution
│   ├── sankey.js               # sankey diagram for taxonomy
│   └── timeline.js             # timeline of extinction
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
The project components work together through `index.html`, which loads the datasets, configuration files, JavaScript scripts, and image resources. The CSV files provide the processed extinction data, while the JavaScript files read the data and render different visualizations on the webpage.
The configuration files help keep shared settings consistent, and the image mapping files connect species records with their corresponding image assets.

The cross-interaction between visual components. The interaction links different charts together so that when users select or focus on one data item, related information can be reflected in other views. This helps users compare extinction patterns across multiple visual sections instead of reading each chart separately.

## Installation 
To view the project remotely you can directly visit the website through link: [Team09_webpage_link](https://dfq-yang.github.io/ECS163_FinalProject_Team09/)

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

### Approach 1 (IDE): Launch VS Code.  
Open the cloned project folder (`ECS163-FinalProject-Team09`) in the editor space via `File > Open Folder`.  
Navigate through the file tree and find `index.html`.  
Right-click on `index.html`, select `Open with Live Server`.  
A local development environment port will open up automatically in your default internet browser, typically:

```text
http://127.0.0.1:5500/index.html
```

Interactive features to explore:  
Generally, click or hover for species images and details. Filter functions in timeline, map, and sankey. Zoom in and out function in map, bubble.
Cross-Graph: Selections made in one view automatically update the others. Generally reacts at class-level; Bubble and Map can react with Timeline at species-level


Make sure the project is opened from the repository root folder instead of opening `index.html` alone from another location. This helps the browser correctly find linked CSS, JavaScript, data, and image files during the demo.

### Approach 2 (Windows System):
If you are using Windows, you can directly run `start.bat` in the project's root folder to launch the process via PowerShell.

### Approach 3 (Website):
To view the project remotely you can directly visit the website through link: [Team09_webpage_link](https://dfq-yang.github.io/ECS163_FinalProject_Team09/)
