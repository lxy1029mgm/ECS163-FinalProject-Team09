const svg = d3.select("svg");
// Set canvas size
const width = window.innerWidth;
const height = window.innerHeight;

svg
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", `0 0 ${width} ${height}`);

svg.selectAll("*").remove();

// Margins
const margin = {
  top: 90,
  right: 300,
  bottom: 40,
  left: 300
};

// Colors for each Sankey level
const levelColor = {
  Phylum: "#5B8FF9",
  Class: "#61DDAA",
  Order: "#65789B",
  Family: "#F6BD16",
  Status: "#E8684A"
};

// Colors for conservation status
const statusColor = {
  Extinct: "#E8684A"
};

// Tooltip for hover interaction
const tooltip = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("background", "white")
  .style("border", "1px solid #999")
  .style("border-radius", "6px")
  .style("padding", "8px 10px")
  .style("font-size", "12px")
  .style("line-height", "1.4")
  .style("box-shadow", "0 2px 8px rgba(0,0,0,0.18)")
  .style("pointer-events", "none")
  .style("opacity", 0);

const animalCard = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("width", "280px")
  .style("background", "rgba(255,255,255,0.96)")
  .style("border", "1px solid rgba(0,0,0,0.18)")
  .style("border-radius", "10px")
  .style("box-shadow", "0 14px 35px rgba(0,0,0,0.22)")
  .style("font-family", "Arial, sans-serif")
  .style("overflow", "hidden")
  .style("pointer-events", "auto")
  .style("opacity", 0)
  .style("transform", "translateY(12px) scale(0.96)")
  .style("transition", "opacity 220ms ease, transform 220ms ease");

function closeAnimalCard() {
  animalCard
    .style("opacity", 0)
    .style("transform", "translateY(12px) scale(0.96)");
}

function getCardPosition(anchorElement) {
  const cardWidth = 280;
  const cardHeight = 330;
  const padding = 12;
  const rect = anchorElement.getBoundingClientRect();

  let left = rect.right + padding;
  let top = rect.top + (rect.height / 2) - (cardHeight / 2);

  if (left + cardWidth > window.innerWidth - padding) {
    left = rect.left - cardWidth - padding;
  }

  if (left < padding) {
    left = padding;
  }

  if (top + cardHeight > window.innerHeight - padding) {
    top = window.innerHeight - cardHeight - padding;
  }

  if (top < padding) {
    top = padding;
  }

  return { left, top };
}

function showAnimalCard(d, anchorElement) {
  const imageUrl = localAnimalImages[d.name];
  const imageSource = localAnimalImageSources.find(item => item.node === d.name);
  const position = getCardPosition(anchorElement);

  animalCard
    .html(`
      <div style="padding:12px 14px 10px;">
        <button id="animal-card-close" style="float:right;border:0;background:#eee;border-radius:50%;width:24px;height:24px;cursor:pointer;">x</button>
        <div style="font-size:13px;color:#666;margin-bottom:4px;">${d.level}</div>
        <div style="font-size:18px;font-weight:bold;line-height:1.2;padding-right:28px;">${d.name}</div>
      </div>
      <div id="animal-image-wrap" style="height:190px;background:#f1f1f1;display:flex;align-items:center;justify-content:center;color:#666;font-size:13px;">
        ${imageUrl
          ? `<img src="${imageUrl}" alt="${d.name}" style="width:100%;height:100%;object-fit:cover;">`
          : `<div style="padding:16px;text-align:center;">Image unavailable</div>`}
      </div>
      <div style="padding:10px 14px 14px;font-size:12px;line-height:1.45;color:#444;">
        ${imageSource ? `<span style="color:#777;">${imageSource.source}</span>` : ""}
      </div>
    `)
    .style("left", `${position.left}px`)
    .style("top", `${position.top}px`)
    .style("opacity", 1)
    .style("transform", "translateY(0) scale(1)");

  d3.select("#animal-card-close").on("click", function() {
    d3.event.stopPropagation();
    closeAnimalCard();
  });
}

// ==================== SANKEY TO PARENT CROSS GRAPH HOOK START ====================
function notifyParentSelection(d) {
  if (!window.parent || window.parent === window || !d || !d.name) return;
  window.parent.postMessage({
    type: "sankeySelect",
    item: {
      name: d.name,
      level: d.level,
      filterName: d.level === "Class" ? d.name : d.name,
      imageKey: d.name
    }
  }, window.location.origin);
}
// ==================== SANKEY TO PARENT CROSS GRAPH HOOK END ====================

// Title
svg.append("text")
  .attr("x", width / 2)
  .attr("y", 30)
  .attr("text-anchor", "middle")
  .attr("font-size", "22px")
  .attr("font-weight", "bold")
  .text("Species Extinction Sankey Diagram");

// Subtitle
svg.append("text")
  .attr("x", width / 2)
  .attr("y", 55)
  .attr("text-anchor", "middle")
  .attr("font-size", "13px")
  .attr("fill", "#555")
  .text("Phylum -> Class -> Order -> Family -> Extinct");

const externalFilterLabel = svg.append("text")
  .attr("x", width / 2)
  .attr("y", 74)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .attr("font-weight", "bold")
  .attr("fill", "#E8684A")
  .style("opacity", 0);

// Legend
const legendData = [
  { label: "Phylum", color: levelColor.Phylum },
  { label: "Class", color: levelColor.Class },
  { label: "Order", color: levelColor.Order },
  { label: "Family", color: levelColor.Family },
  { label: "Extinct", color: statusColor.Extinct }
];

const legend = svg.append("g")
  .attr("transform", `translate(${width - 220}, 20)`);

legend.selectAll("rect")
  .data(legendData)
  .enter()
  .append("rect")
  .attr("x", 0)
  .attr("y", (d, i) => i * 18)
  .attr("width", 12)
  .attr("height", 12)
  .attr("fill", d => d.color)
  .attr("stroke", "#333")
  .attr("stroke-width", 0.4);

legend.selectAll("text")
  .data(legendData)
  .enter()
  .append("text")
  .attr("x", 18)
  .attr("y", (d, i) => i * 18 + 10)
  .attr("font-size", "11px")
  .attr("fill", "#333")
  .text(d => d.label);

// Instruction text
svg.append("text")
  .attr("x", width / 2)
  .attr("y", height - 12)
  .attr("text-anchor", "middle")
  .attr("font-size", "11px")
  .attr("fill", "#666")
  .text("Hover over a flow to see count and percentages. Click a node/name to show an image. Click a flow to focus its path. Click blank space to reset.");
// Readability note
svg.append("text")
  .attr("x", width / 2)
  .attr("y", height - 24)
  .attr("text-anchor", "middle")
  .attr("font-size", "11px")
  .attr("fill", "#888")
  .text("Note: For readability, only the top 30 families are shown, so some smaller classes are not displayed.");
// Create Sankey layout
const sankey = d3.sankey()
  .nodeWidth(16)
  .nodePadding(12)
  .nodeSort((a, b) => b.value - a.value)
  .extent([
    [margin.left, margin.top],
    [width - margin.right, height - margin.bottom]
  ]);

// Create unique node id
function makeId(level, name) {
  return `${level}|||${name}`;
}

// Use redlistCategory to identify extinct records
function getConservationStatus(d) {
  const redlistCategory = (d.redlistCategory || "").trim();

  if (redlistCategory === "Extinct") {
    return "Extinct";
  }

  return "Other";
}

// Format percent
function formatPercent(value, total) {
  if (!total || total === 0) {
    return "0.0%";
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}

// Load CSV
d3.csv("merged_cleaned_with_clean_labels.csv").then(function(data) {

  // Add readable conservation status based on redlistCategory
  data.forEach(d => {
    d.conservation_status = getConservationStatus(d);
  });

  // Keep only extinct records with all required fields
  data = data.filter(d =>
    d.phylum_name &&
    d.class_name &&
    d.order_name &&
    d.family_name &&
    d.conservation_status === "Extinct"
  );

  // Keep top 30 families to reduce clutter
  const topFamilies = d3.nest()
    .key(d => d.family_name)
    .rollup(v => v.length)
    .entries(data)
    .sort((a, b) => b.value - a.value)
    .slice(0, 30)
    .map(d => d.key);

  const familySet = new Set(topFamilies);
  data = data.filter(d => familySet.has(d.family_name));

  const totalDisplayedRecords = data.length;

  // Count links between two columns
  function countLinks(sourceCol, targetCol, sourceLevel, targetLevel) {
    const grouped = d3.nest()
      .key(d => d[sourceCol])
      .key(d => d[targetCol])
      .rollup(v => v.length)
      .entries(data);

    const links = [];

    grouped.forEach(sourceGroup => {
      sourceGroup.values.forEach(targetGroup => {
        links.push({
          source: makeId(sourceLevel, sourceGroup.key),
          target: makeId(targetLevel, targetGroup.key),
          sourceName: sourceGroup.key,
          targetName: targetGroup.key,
          sourceLevel: sourceLevel,
          targetLevel: targetLevel,
          value: targetGroup.value
        });
      });
    });

    return links;
  }

  // Build 5-layer Sankey links
  const rawLinks = [
    ...countLinks("phylum_name", "class_name", "Phylum", "Class"),
    ...countLinks("class_name", "order_name", "Class", "Order"),
    ...countLinks("order_name", "family_name", "Order", "Family"),
    ...countLinks("family_name", "conservation_status", "Family", "Status")
  ];

  // Build nodes
  const nodeMap = new Map();

  rawLinks.forEach(link => {
    if (!nodeMap.has(link.source)) {
      nodeMap.set(link.source, {
        id: link.source,
        name: link.sourceName,
        level: link.sourceLevel
      });
    }

    if (!nodeMap.has(link.target)) {
      nodeMap.set(link.target, {
        id: link.target,
        name: link.targetName,
        level: link.targetLevel
      });
    }
  });

  const nodes = Array.from(nodeMap.values());

  // Convert node ids to indexes
  const nodeIndex = new Map(nodes.map((d, i) => [d.id, i]));

  const links = rawLinks.map(d => ({
    source: nodeIndex.get(d.source),
    target: nodeIndex.get(d.target),
    value: d.value
  }));

  // Generate Sankey layout
  const graph = sankey({
    nodes: nodes.map(d => Object.assign({}, d)),
    links: links.map(d => Object.assign({}, d))
  });

  // Column headers
  const levels = ["Phylum", "Class", "Order", "Family", "Status"];

  const headerData = levels.map(level => {
    const levelNodes = graph.nodes.filter(d => d.level === level);

    return {
      level: level,
      x: d3.mean(levelNodes, d => (d.x0 + d.x1) / 2)
    };
  });

  svg.append("g")
    .selectAll("text")
    .data(headerData)
    .enter()
    .append("text")
    .attr("x", d => d.x)
    .attr("y", 88)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("font-weight", "bold")
    .attr("fill", d => levelColor[d.level])
    .text(d => d.level);

  // Groups
  const linkGroup = svg.append("g").attr("fill", "none");
  const nodeGroup = svg.append("g");
  const labelGroup = svg.append("g");

  let focusedLinks = null;
  let focusedNodes = null;

  function hasFocus() {
    return focusedLinks !== null && focusedNodes !== null;
  }

  // Draw links
  const linkSelection = linkGroup
    .selectAll("path")
    .data(graph.links)
    .enter()
    .append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => {
      if (d.target.level === "Status") {
        return statusColor[d.target.name] || levelColor.Status;
      }
      return "#B0B0B0";
    })
    .attr("stroke-opacity", 0.38)
    .attr("stroke-width", d => Math.max(1, d.width))
    .style("cursor", "pointer")
    .on("click", function(d) {
      d3.event.stopPropagation();
      focusOnLink(d);
    })
    .on("mouseover", function(d) {
      if (!hasFocus()) {
        d3.select(this)
          .attr("stroke-opacity", 0.9)
          .attr("stroke-width", Math.max(3, d.width + 2));
      }

      const sourceShare = formatPercent(d.value, d.source.value);
      const totalShare = formatPercent(d.value, totalDisplayedRecords);

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d.source.name} -> ${d.target.name}</strong><br>
          Count: ${d.value} species<br>
          Share of ${d.source.name}: ${sourceShare}<br>
          Share of all displayed records: ${totalShare}
        `);
    })
    .on("mousemove", function() {
      tooltip
        .style("left", (d3.event.pageX + 14) + "px")
        .style("top", (d3.event.pageY + 14) + "px");
    })
    .on("mouseout", function(d) {
      if (!hasFocus()) {
        d3.select(this)
          .attr("stroke-opacity", 0.38)
          .attr("stroke-width", Math.max(1, d.width));
      }

      tooltip.style("opacity", 0);
    });

  // Draw nodes
  const nodeSelection = nodeGroup
    .selectAll("rect")
    .data(graph.nodes)
    .enter()
    .append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => Math.max(1, d.y1 - d.y0))
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("fill", d => {
      if (d.level === "Status") {
        return statusColor[d.name] || levelColor.Status;
      }
      return levelColor[d.level];
    })
    .attr("stroke", "#333")
    .attr("stroke-width", 0.6)
    .style("cursor", d => d.level === "Status" ? "default" : "pointer")
    .on("click", function(d) {
      d3.event.stopPropagation();
      if (d.level !== "Status") {
        notifyParentSelection(d);
        showAnimalCard(d, this);
      }
    })
    .on("mouseover", function(d) {
      if (!hasFocus()) {
        d3.select(this).attr("stroke-width", 1.8);
      }

      const nodeShare = formatPercent(d.value, totalDisplayedRecords);

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d.level}: ${d.name}</strong><br>
          Count: ${d.value} species<br>
          Share of all displayed records: ${nodeShare}
        `);
    })
    .on("mousemove", function() {
      tooltip
        .style("left", (d3.event.pageX + 14) + "px")
        .style("top", (d3.event.pageY + 14) + "px");
    })
    .on("mouseout", function() {
      if (!hasFocus()) {
        d3.select(this).attr("stroke-width", 0.6);
      }
      tooltip.style("opacity", 0);
    });

  // Draw labels
  const labelSelection = labelGroup
    .selectAll("text.node-label")
    .data(graph.nodes)
    .enter()
    .append("text")
    .attr("class", "node-label")
    .attr("x", d => {
      if (d.level === "Phylum") return d.x1 + 8;
      if (d.level === "Status") return d.x0 - 8;
      return d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6;
    })
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => {
      if (d.level === "Phylum") return "start";
      if (d.level === "Status") return "end";
      return d.x0 < width / 2 ? "start" : "end";
    })
    .attr("font-size", d => {
      const nodeHeight = d.y1 - d.y0;
      if (d.level === "Status") return "12px";
      if (nodeHeight < 6) return "6px";
      if (nodeHeight < 10) return "7px";
      if (nodeHeight < 16) return "8px";
      return "10px";
    })
    .attr("font-weight", d => d.level === "Status" ? "bold" : "normal")
    .attr("fill", "#222")
    .style("pointer-events", d => d.level === "Status" ? "none" : "auto")
    .style("cursor", d => d.level === "Status" ? "default" : "pointer")
    .on("click", function(d) {
      d3.event.stopPropagation();
      notifyParentSelection(d);
      showAnimalCard(d, this);
    })
    .text(d => d.name);

  // Get ancestors of a link's source
  function addAncestors(startNode, selectedNodes, selectedLinks) {
    const queue = [startNode];

    while (queue.length > 0) {
      const current = queue.shift();

      graph.links.forEach(link => {
        if (link.target === current && !selectedLinks.has(link)) {
          selectedLinks.add(link);

          if (!selectedNodes.has(link.source)) {
            selectedNodes.add(link.source);
            queue.push(link.source);
          }

          if (!selectedNodes.has(link.target)) {
            selectedNodes.add(link.target);
          }
        }
      });
    }
  }

  // Get descendants of a link's target
  function addDescendants(startNode, selectedNodes, selectedLinks) {
    const queue = [startNode];

    while (queue.length > 0) {
      const current = queue.shift();

      graph.links.forEach(link => {
        if (link.source === current && !selectedLinks.has(link)) {
          selectedLinks.add(link);

          if (!selectedNodes.has(link.target)) {
            selectedNodes.add(link.target);
            queue.push(link.target);
          }

          if (!selectedNodes.has(link.source)) {
            selectedNodes.add(link.source);
          }
        }
      });
    }
  }

  // Click one link and keep only its related full path
  function focusOnLink(clickedLink) {
    const selectedNodes = new Set();
    const selectedLinks = new Set();

    selectedLinks.add(clickedLink);
    selectedNodes.add(clickedLink.source);
    selectedNodes.add(clickedLink.target);

    addAncestors(clickedLink.source, selectedNodes, selectedLinks);
    addDescendants(clickedLink.target, selectedNodes, selectedLinks);

    focusedLinks = selectedLinks;
    focusedNodes = selectedNodes;

    linkSelection
      .attr("stroke-opacity", d => focusedLinks.has(d) ? 0.85 : 0)
      .attr("stroke-width", d => focusedLinks.has(d) ? Math.max(2, d.width) : 0);

    nodeSelection
      .attr("opacity", d => focusedNodes.has(d) ? 1 : 0)
      .attr("stroke-width", d => focusedNodes.has(d) ? 0.6 : 0);

    labelSelection
      .attr("opacity", d => focusedNodes.has(d) ? 1 : 0);
  }

  // ==================== SANKEY CROSS GRAPH IFRAME HOOK START ====================
  function focusOnNodeName(nodeName) {
    const targetName = String(nodeName || "").trim().toUpperCase();
    if (!targetName) {
      externalFilterLabel.style("opacity", 0);
      resetFocus();
      return;
    }

    const matchedNodes = graph.nodes.filter(node =>
      String(node.name || "").trim().toUpperCase() === targetName
    );

    if (!matchedNodes.length) {
      externalFilterLabel
        .text(`No Sankey match for: ${targetName}`)
        .style("opacity", 1);
      resetFocus();
      return;
    }

    externalFilterLabel
      .text(`Filtered by: ${targetName}`)
      .style("opacity", 1);

    const selectedNodes = new Set();
    const selectedLinks = new Set();

    matchedNodes.forEach(node => {
      selectedNodes.add(node);
      addAncestors(node, selectedNodes, selectedLinks);
      addDescendants(node, selectedNodes, selectedLinks);
    });

    focusedLinks = selectedLinks;
    focusedNodes = selectedNodes;
    closeAnimalCard();

    linkSelection
      .attr("stroke-opacity", d => focusedLinks.has(d) ? 0.85 : 0)
      .attr("stroke-width", d => focusedLinks.has(d) ? Math.max(2, d.width) : 0);

    nodeSelection
      .attr("opacity", d => focusedNodes.has(d) ? 1 : 0)
      .attr("stroke-width", d => focusedNodes.has(d) ? 0.6 : 0);

    labelSelection
      .attr("opacity", d => focusedNodes.has(d) ? 1 : 0);
  }

  window.addEventListener("message", function(event) {
    if (event.origin !== window.location.origin) return;
    const message = event.data || {};
    if (message.type !== "crossGraphSelect") return;
    focusOnNodeName(message.selectedName);
  });

  window.focusSankeyNode = focusOnNodeName;

  let lastParentSelectionTime = 0;
  window.setInterval(function() {
    if (!window.parent || window.parent === window) return;
    const parentSelection = window.parent.CrossGraphLastSelection;
    if (!parentSelection || !parentSelection.time) return;
    if (parentSelection.time === lastParentSelectionTime) return;
    lastParentSelectionTime = parentSelection.time;
    focusOnNodeName(parentSelection.selectedName);
  }, 200);
  // ==================== SANKEY CROSS GRAPH IFRAME HOOK END ====================

  // Reset everything
  function resetFocus() {
    focusedLinks = null;
    focusedNodes = null;
    closeAnimalCard();
    externalFilterLabel.style("opacity", 0);

    linkSelection
      .attr("stroke-opacity", 0.38)
      .attr("stroke-width", d => Math.max(1, d.width));

    nodeSelection
      .attr("opacity", 1)
      .attr("stroke-width", 0.6);

    labelSelection
      .attr("opacity", 1);
  }

  // Click blank space to reset
  svg.on("click", function() {
    resetFocus();
  });

});




