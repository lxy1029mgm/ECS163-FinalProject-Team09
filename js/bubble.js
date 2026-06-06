
{// create container
const container = d3.select("#bubble-container");

// get dimensions of the container from HTML
const width = container.node().clientWidth;
const height = container.node().clientHeight;

// create SVG element with viewBox for responsive scaling
const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("background", "#121214");

// divided into circles and texts layers for better z-index control
const gCircles = svg.append("g").attr("class", "circles-layer");
const gTexts = svg.append("g").attr("class", "texts-layer");

// tooltip
const tooltip = d3.select("#tooltip");
const color = d3.scaleOrdinal(d3.schemeTableau10);


// map class and emoji
const classEmojiMap = {
    "GASTROPODA": "🐚", "ACTINOPTERYGII": "🐟", "ARACHNIDA": "🕷️",
    "MALACOSTRACA": "🦞", "INSECTA": "🦋", "DIPLOPODA": "🐛",
    "REPTILIA": "🦎", "BIVALVIA": "🦪", "CLITELLATA": "🪱",
    "MAMMALIA": "🐆", "AMPHIBIA": "🐸", "AVES": "🐦",
    "CHONDRICHTHYES": "🦈", "Unknown": "🐾"
};

// determine class label based on level and active state
// (Level 1: Cause, fully shown)
// Level 2: Class, shortened name (3 letters) for all
// Level 3: Species, full name for active class title
function getClassLabel(name, level, isActive) {

    const emoji = classEmojiMap[name] || "🐾";

    if (level === 2) {
        return emoji;
    }

    if (level === 3 && isActive) {
        return `${emoji} ${name}`;
    }

    return "";
}

// global state
let currentLevel = 1;// 1: Cause, 2: Class, 3: Species
let activeCauseNode = null;//selected cause node at level 2
let activeClassNode = null;//selected class node at level 3
let currentK = 1;// current zoom scale

function getActiveColor() {// species color matches the active cause color
    return activeCauseNode ? color(activeCauseNode.data.name) : "#ffffff";
}

// ---- Zoom behavior ----
//apply to the whole svg but only transforms the circles and texts groups
//so tooltip and other UI elements not affected
const zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 40])
    .on("zoom", (event) => {
        gCircles.attr("transform", event.transform);
        gTexts.attr("transform", event.transform);
    });

svg.call(zoomBehavior);

// ---- Load and process data ----
d3.csv("extinction.csv").then(data => {

    const map = {};
    data.forEach(d => {

        //only consider extinct species, if dataset has endangered and extinct mixed
        if (d.category !== "EX" && d.redlistCategory !== "Extinct") return;
        
        //handle missing or inconsistent fields
        const cause = d.main_threat_clean || "Unknown";
        const cls = d.class_name || "Unknown";
        const species = d.scientificName || d.scientific_name;

        // skip entries without valid cause or class, if any
        if (!species) return;
        if (!map[cause]) map[cause] = { name: cause, children: {} };
        if (!map[cause].children[cls]) map[cause].children[cls] = { name: cls, children: [] };

        // push species data into the right place in the hierarchy
        map[cause].children[cls].children.push({
            name: species,
            taxonId: d.taxonid || d.taxonID || d.taxon_id,
            year: d.yearLastSeen,
            location: d.location_clean,
            habitat: d.habitat
        });
    });

    // convert map to hierarchical data structure
    const rootData = {
        name: "root",
        children: Object.values(map).map(cause => ({
            name: cause.name,
            children: Object.values(cause.children)
        }))
    };

    // create d3 hierarchy and pack layout
    const root = d3.hierarchy(rootData).sum(d => d.children ? 0 : 1);
    const pack = d3.pack().size([width, height]).padding(15);
    pack(root);

    // ---- Visualization Update Function ----
    function updateVisualization() {

        // get nodes for current level
        const allNodes = root.descendants();
        // filter to get only cause nodes (depth 1) for the first layer
        const causeNodes = allNodes.filter(d => d.depth === 1);

        // Cause Level Circles
        const causeCirclesBind = gCircles.selectAll(".cause-circle")
                                        .data(causeNodes, d => d.data.name);// ensure proper data binding
        const causeCirclesEnter = causeCirclesBind.enter()// only append cause circles at level 1
                                                .append("circle")
                                                .attr("class", "cause-circle")// set initial attributes for cause circles
                                                .attr("cx", d => d.x)
                                                .attr("cy", d => d.y)
                                                .attr("r", d => d.r)// initial radius, will transition to final size
                                                .attr("fill", d => color(d.data.name))// color based on cause name
                                                .attr("fill-opacity", 0.12)// color, light opacity for better layering
                                                .attr("stroke", d => color(d.data.name))
                                                .attr("stroke-width", 2)// stroke to make them stand out more
                                                .style("cursor", "pointer")// pointer cursor to indicate interactivity

                                                // click to zoom into cause level
                                                .on("click", (event, d) => {
                                                    event.stopPropagation();
                                                    // ==================== BUBBLE CROSS GRAPH HOOK START ====================
                                                    if (window.CrossGraph) {
                                                        window.CrossGraph.select({ name: d.data.name, level: "Cause" }, event.currentTarget);
                                                    }
                                                    // ==================== BUBBLE CROSS GRAPH HOOK END ====================
                                                    if (currentLevel !== 1) return;// only allow clicking when in cause level
                                                    currentLevel = 2; // zoom into the selected cause
                                                    activeCauseNode = d;// set active cause node for class level
                                                    zoomTo(d, 0.75, () => updateVisualization());// zoom in with a callback to update visualization after transition
                                                })

                                                // hover tooltip for cause circles
                                                .on("mouseover", (event, d) => {
                                                    if (currentLevel !== 1) return;//only for cause level

                                                    // tooltip content with cause name and total extinct species count
                                                    tooltip.style("opacity", 1).html(`
                                                        <div style="text-align:center;">
                                                            <strong style="color:${color(d.data.name)}; font-size:14px;">${d.data.name}</strong><br/>
                                                            <span style="opacity:0.8">Total Extinct Species: <b>${d.value || 0}</b></span>
                                                        </div>
                                                    `);
                                                })

                                                // move tooltip with mouse
                                                // hide tooltip on mouse out
                                                .on("mousemove", (event) => tooltip.style("left", (event.pageX + 15) + "px")
                                                                                .style("top", (event.pageY + 15) + "px"))
                                                .on("mouseout", () => tooltip.style("opacity", 0))

        // Apply pointer-events immediately, THEN transition visually
        const mergedCauses = causeCirclesBind.merge(causeCirclesEnter);
        mergedCauses.style("pointer-events", d => (currentLevel === 1) ? "auto" : "none")
            .transition().duration(600)
            .style("opacity", d => (currentLevel === 1 || d === activeCauseNode) ? 1 : 0);


        // Class Level Circles
        if (currentLevel >= 2) {// only render class circles when in class or species level

            const classNodes = activeCauseNode.descendants()
                                            .filter(d => d.depth === 2);// get class nodes under the active cause node

            const classCirclesBind = gCircles.selectAll(".class-circle")// bind class nodes to class circles
                                            .data(classNodes, d => d.data.name);// use class name as key

            const classCirclesEnter = classCirclesBind.enter()
                                                    .append("circle")
                                                    .attr("class", "class-circle")
                                                    .attr("cx", d => d.x).attr("cy", d => d.y)
                                                    .attr("r", d => Math.max(d.r, 10))
                                                    .attr("fill", "#17171a")
                                                    .attr("stroke", "#44444a")
                                                    .attr("stroke-width", 1.5) // Kept the actual visible stroke
                                                    .style("cursor", "pointer")
                                                    
                                                    // click to zoom into class level
                                                    .on("click", (event, d) => {
                                                        event.stopPropagation();
                                                        // ==================== BUBBLE CROSS GRAPH HOOK START ====================
                                                        if (window.CrossGraph) {
                                                            window.CrossGraph.select({ name: d.data.name, level: "Class" }, event.currentTarget);
                                                        }
                                                        // ==================== BUBBLE CROSS GRAPH HOOK END ====================
                                                        if (currentLevel !== 2) return;
                                                        currentLevel = 3; 
                                                        activeClassNode = d;
                                                        zoomTo(d, 0.65, () => updateVisualization());
                                                    })

                                                    // hover tooltip for class circles
                                                    .on("mouseover", (event, d) => {
                                                        tooltip.style("opacity", 1).html(`
                                                            <div style="text-align:center;">
                                                                <div style="font-size:30px; margin-bottom:5px;">${classEmojiMap[d.data.name] || "🐾"}</div>
                                                                <strong style="color:${getActiveColor()}; font-size:14px;">${d.data.name}</strong><br/>
                                                                <span style="opacity:0.8">Count: <b>${d.value || 0}</b></span>
                                                            </div>
                                                        `);
                                                    })
                                                    .on("mousemove", (event) => tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY + 15) + "px"))
                                                    .on("mouseout", () => tooltip.style("opacity", 0));

            // Apply pointer-events instantly to prevent sibling nodes from blocking edge dots
            const mergedClasses = classCirclesBind.merge(classCirclesEnter);
            mergedClasses.style("pointer-events", d => (currentLevel === 2 || (currentLevel === 3 && d === activeClassNode)) ? "auto" : "none")
                            .transition()
                            .duration(600)
                            .style("opacity", d => (currentLevel === 2 || d === activeClassNode) ? 1 : 0);
                            
            classCirclesBind.exit().remove();// remove useless circles when switching levels
        } else {
            gCircles.selectAll(".class-circle").remove();// remove all class circles when going back to cause level
        }

        // Species Level Circles(Dots)
        // similar logic to class circles
        if (currentLevel === 3) {// only render species dots when in species level
            const speciesNodes = activeClassNode.descendants()
                                                .filter(d => d.depth === 3);// get species nodes under the active class node
            const dotBind = gCircles.selectAll(".species-dot")
                                    .data(speciesNodes, d => d.data.name);// bind species nodes to species dots, use species name as key
            dotBind.enter()
                    .append("circle")// append new circles for new species nodes
                    .attr("class", "species-dot")// set initial attributes for species dots
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y)
                    .attr("r", 0) // start with radius 0 for a growing effect
                    .attr("fill", getActiveColor())// same color as the active cause for visual connection
                    .attr("fill-opacity", 0.85)// brighter fill with higher opacity, pop as the smallest circles
                    .attr("stroke", "#fff")// white stroke to stand out
                    .attr("stroke-width", 0.3)
                    // ==================== BUBBLE CROSS GRAPH HOOK START ====================
                    .style("cursor", "pointer")
                    .on("click", (event, d) => {
                        event.stopPropagation();
                        if (window.CrossGraph) {
                            // FIX: Send the Species name and TaxonID, not the Class name
                            window.CrossGraph.select({ name: d.data.name, taxonId: d.data.taxonId, level: "Species" }, event.currentTarget);
                        }
                    })
                    // ==================== BUBBLE CROSS GRAPH HOOK END ====================
                    .on("mouseover", showTooltip)// show tooltip on hover with species details
                    .on("mousemove", moveTooltip)// move tooltip with mouse
                    .on("mouseout", hideTooltip)// hide tooltip when mouse out
                    .transition()
                    .duration(600)// animate the radius to grow from 0 to final size
                    .attr("r", Math.max(1.5, 4 / currentK)); // final radius scaled by current zoom level
            dotBind.exit()// remove species dots when switching back to class or cause level
                .remove();
        } else {
            gCircles.selectAll(".species-dot")
                    .remove();// remove species dots when not in species level
        }

        // ----- Texts Update ------

        // Cause Labels
        const causeLabelBind = gTexts.selectAll(".cause-label")// bind cause nodes to cause labels
            .data(causeNodes, d => d.data.name);// use cause name as key

        const causeLabelMerge = causeLabelBind.enter()// append text elements for cause labels
            .append("text")
            .attr("class", "cause-label")
            .attr("text-anchor", "middle")// center the text, and other settings for better visibility
            .style("fill", "#fff")
            .style("font-weight", "bold")
            .style("pointer-events", "none")// make labels non-interactive, to avoid conflict with circle interactions
            .merge(causeLabelBind);// merge with existing labels for update

        // control cause label visibility based on current level and active nodes
        causeLabelMerge.transition()
            .duration(400)//animation duration
            .style("opacity", d => {
                if (currentLevel === 1) return 1; // show all cause labels in level 1
                if (currentLevel >= 2 && d === activeCauseNode) return 1; // only show active cause label in level 2 and 3
                return 0; // otherwise hide
            })
            .style("visibility", d => {
                // transition from hidden to visible or vice versa for smoother effect
                if (currentLevel === 1 || d === activeCauseNode) return "visible";
                return "hidden";
            });

        // split cause labels into two lines for long names at level 1, for better readability
        // keep them single line for other cases

        causeLabelMerge.each(function(d) {
            const el = d3.select(this);
            el.selectAll("tspan").remove(); // clear existing tspans before adding new ones

            const name = d.data.name;

            // after testing, only split "Climate Change" and "Water Modification" into two lines
            // as they are the longest and only have small circles
            const shouldBreak = currentLevel === 1 && (name === "Climate Change" || name === "Water Modification");

            if (shouldBreak) {
                const words = name.split(" ");// split into two words
                el.append("tspan").text(words[0]).attr("x", d.x).attr("dy", "-0.2em");// first word above
                el.append("tspan").text(words[1]).attr("x", d.x).attr("dy", "1.2em");// second word below, with some spacing
            } else {
                el.append("tspan").text(name).attr("x", d.x).attr("dy", "0.35em");// other cases: single line, vertically centered
            }
        });

        // position and size
        causeLabelMerge.transition().duration(800)// animate position and font size changes
            .attr("x", d => d.x)
            .attr("y", d => {
                // adjust y position based on current level and circle size
                // keep labels nicely positioned above the circles
                if (currentLevel === 1) return d.y;
                return d.y - d.r + (30 / currentK); 
            })
            .style("font-size", d => currentLevel === 1 ? "15px" : `${Math.min(18, 60 / currentK)}px`);// larger font size for cause labels, scaled down with zoom level
                
        // Class Labels
        if (currentLevel >= 2) {// only handle class labels in class or species level
            const classNodes = activeCauseNode.descendants().filter(d => d.depth === 2);
            const classLabelBind = gTexts.selectAll(".class-label")
                                        .data(classNodes, d => d.data.name);// bind class nodes to class labels, use class name as key
            
            const classLabelMerge = classLabelBind.enter()
                .append("text")
                .attr("class", "class-label")
                .style("pointer-events", "none") // CRITICAL: Lets clicks pass through to dots underneath!
                .attr("text-anchor", "middle")
                .style("fill", "#cccccc")
                .style("font-weight", "600")
                .merge(classLabelBind); 
                // FIX: Removed the dead click handler here. The underlying class circle
                // already handles the zoom interaction perfectly.

            // class labels visibility logic
            classLabelMerge.transition().duration(400)
                .style("opacity", d => {
                    if (currentLevel === 3 && d === activeClassNode) return 1; // show selected class label in level 3
                    return 0;
                });

            // update class label text based on current level and active state
            classLabelMerge.text(d => getClassLabel(d.data.name, currentLevel, d === activeClassNode))
                .transition().duration(800)//animation
                .attr("x", d => d.x)

                // adjust y position to be above the circles, with more offset for the active class label in species level
                .attr("y", d => (currentLevel === 3 && d === activeClassNode) ? d.y - d.r + (20 / currentK) : d.y + (4 / currentK))
                .style("font-size", d => (currentLevel === 3 && d === activeClassNode) ? `${Math.min(14, 45 / currentK)}px` : `${Math.min(10, 32 / currentK)}px`);

            classLabelBind.exit().remove();// remove class labels when switching back to cause level
        } else {
            // fade out animation when going back to cause level, then remove
            gTexts.selectAll(".class-label").transition().duration(300).style("opacity", 0).remove();
        }
    }

    updateVisualization();// initial render

    // ==================== BUBBLE CROSS GRAPH HOOK START ====================
    function normalizeCrossGraphName(value) {
        return String(value || "").trim().toUpperCase();
    }

    function focusSpeciesFromCrossGraph(speciesName, taxonId) {
        const targetName = normalizeCrossGraphName(speciesName);
        const targetTaxonId = String(taxonId || "").trim();
        if (!targetName && !targetTaxonId) return false;

        const speciesNode = root.descendants().find(d =>
            d.depth === 3 &&
            (
                normalizeCrossGraphName(d.data.name) === targetName ||
                (targetTaxonId && String(d.data.taxonId || "").trim() === targetTaxonId)
            )
        );
        if (!speciesNode || !speciesNode.parent || !speciesNode.parent.parent) return false;

        activeCauseNode = speciesNode.parent.parent;
        activeClassNode = speciesNode.parent;
        currentLevel = 3;

        zoomTo(activeClassNode, 0.65, () => {
            updateVisualization();
            window.setTimeout(() => {
                window.CrossGraph.applyHighlight(gCircles.selectAll(".species-dot"), targetName);
                window.CrossGraph.applyHighlight(gTexts.selectAll(".class-label"), normalizeCrossGraphName(activeClassNode.data.name));
            }, 80);
        });

        return true;
    }

    window.addEventListener("crossGraphSelect", function(event) {
        const item = event.detail && event.detail.item;
        const selectedName = event.detail && event.detail.selectedName;
        if (!window.CrossGraph) return;

        if (item && item.level === "Species" && focusSpeciesFromCrossGraph(item.name, item.taxonId)) {
            return;
        }

        window.CrossGraph.applyHighlight(gCircles.selectAll(".cause-circle"), selectedName);
        window.CrossGraph.applyHighlight(gCircles.selectAll(".class-circle"), selectedName);
        window.CrossGraph.applyHighlight(gCircles.selectAll(".species-dot"), selectedName);
        window.CrossGraph.applyHighlight(gTexts.selectAll(".cause-label"), selectedName);
        window.CrossGraph.applyHighlight(gTexts.selectAll(".class-label"), selectedName);
    });
    // ==================== BUBBLE CROSS GRAPH HOOK END ====================

    // ---- Zoom Function ----
    function zoomTo(d, factor, callback) {
        const minDim = Math.min(width, height);// base the zoom scale on the minimum dimension of the viewport to ensure it fits well
        currentK = (minDim / (d.r * 2)) * factor; // calculate the zoom scale with an additional factor for better framing

        const tx = width / 2 - d.x * currentK;// calculate translation to center the zoom on the target node
        const ty = height / 2 - d.y * currentK;

        // zoom with smooth transition
        // call the callback function after the transition ends to update the visualization
        svg.transition().duration(1000).ease(d3.easeCubicInOut)
            .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(currentK))
            .on("end", callback);
    }

    // click on empty space to zoom out
    svg.on("click", (event) => {
        if (event.target.tagName === "svg") {// only trigger when clicking on empty space
            if (currentLevel === 3) {// zoom out from species to class level
                currentLevel = 2; 
                activeClassNode = null;// clear active class node, show all class

                // recalculate zoom scale to fit the active cause node, with some padding
                const minDim = Math.min(width, height);

                // zoom out a bit more to ensure the whole cause circle is nicely framed
                currentK = (minDim / (activeCauseNode.r * 2)) * 0.75;

                updateVisualization(); //update visualization to show class level
                zoomTo(activeCauseNode, 0.75);// zoom out to the active cause node

            } else if (currentLevel === 2) {// zoom out from class to cause level
                currentLevel = 1; 
                activeCauseNode = null;// clear active cause node, show all causes
                currentK = 1; // reset zoom scale to default for cause level

                updateVisualization();//update visualization to show cause level
                svg.transition()
                .duration(1000)//animation
                .ease(d3.easeCubicInOut)// smoothly transition back to the original view
                .call(zoomBehavior.transform, d3.zoomIdentity);// reset zoom to original state
            }
        }
    });

    // ---- Tooltip Function ----
    // ---- Tooltip Function ----
    function showTooltip(event, d) {

        d3.select(this)
            .transition()
            .duration(100)
            .attr("r", 8 / currentK)
            .attr("fill", "#fff");

        // FIX: Removed the // JavaScript comments from inside the HTML string 
        // FIX: Explicitly set pointer-events: none on the tooltip so it can't trap the mouse
        tooltip.style("opacity", 1)
               .style("pointer-events", "none") 
               .html(`
                <div style="font-family: sans-serif; line-height: 1.4;">
                    <div style="float:right; font-size:20px; margin-left:10px;">${classEmojiMap[activeClassNode.data.name] || "🐾"}</div>
                    <strong style="color:${getActiveColor()}; font-size:14px;">${d.data.name}</strong><br/> 
                    <hr style="border:0; border-top:1px solid #444; margin:4px 0;">
                    <b>Last Seen:</b> ${d.data.year || "Unknown"}<br/>
                    <b>Location:</b> ${d.data.location || "Unknown"}<br/>
                    <b>Habitat:</b> ${d.data.habitat || "Unknown"}
                </div>
            `);
        moveTooltip(event);
    }

    function moveTooltip(event) { // update tooltip position to follow the mouse
        tooltip.style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY + 15) + "px"); 
    }

    function hideTooltip() { // reset the hovered species dot to its original size and color
        d3.select(this)
        .transition()
        .duration(100)
        .attr("r", Math.max(1.5, 4 / currentK)).attr("fill", getActiveColor()); 
        tooltip.style("opacity", 0); // hide the tooltip
    }
});

}
// By Xinyi Li
// Bubble Graph inspired by Mike Bostock's "Zoomable Circle Packing"
// https://observablehq.com/@d3/zoomable-circle-packing

// Data source: IUCN Red List of Threatened Species

// I used ChatGPT to help with hirearchy construction
// Also optimize the zooming logic and some layout conflicts
// Debug
