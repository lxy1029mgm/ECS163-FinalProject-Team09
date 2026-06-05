// ==================== CROSS GRAPH + ANIMAL IMAGE POPUP START ====================
// Shared selection, cross-chart highlighting, and local animal images.

(function () {
  const cardWidth = 300;
  const cardHeight = 360;
  const gap = 14;

  const state = {
    selected: null
  };

  const card = d3.select("body")
    .append("div")
    .attr("id", "animal-image-card")
    .style("position", "fixed")
    .style("z-index", 3000)
    .style("width", `${cardWidth}px`)
    .style("background", "rgba(255,255,255,0.97)")
    .style("border", "1px solid rgba(0,0,0,0.18)")
    .style("border-radius", "8px")
    .style("box-shadow", "0 18px 45px rgba(0,0,0,0.22)")
    .style("color", "#111111")
    .style("font-family", "Inter, Segoe UI, sans-serif")
    .style("overflow", "hidden")
    .style("pointer-events", "auto")
    .style("opacity", 0)
    .style("transform", "translateY(10px) scale(0.96)")
    .style("transition", "opacity 180ms ease, transform 180ms ease");

  function getPosition(anchorElement) {
    const rect = anchorElement.getBoundingClientRect();
    let left = rect.right + gap;
    let top = rect.top + rect.height / 2 - cardHeight / 2;

    if (left + cardWidth > window.innerWidth - gap) {
      left = rect.left - cardWidth - gap;
    }
    if (left < gap) left = gap;
    if (top + cardHeight > window.innerHeight - gap) {
      top = window.innerHeight - cardHeight - gap;
    }
    if (top < gap) top = gap;

    return { left, top };
  }

  function closeCard() {
    card
      .style("opacity", 0)
      .style("transform", "translateY(10px) scale(0.96)");
  }

  function showImageCard(item, anchorElement) {
    if (!item || !item.name || !anchorElement) return;

    const displayName = item.displayName || item.name;
    const imageCandidates = [item.name, item.displayName, item.imageKey, item.filterName]
      .filter(Boolean);
    let imageKey = imageCandidates[0];
    let rawImageUrl = "";
    if (window.localAnimalImages) {
      for (const candidate of imageCandidates) {
        if (window.localAnimalImages[candidate]) {
          imageKey = candidate;
          rawImageUrl = window.localAnimalImages[candidate];
          break;
        }
      }
    }
    const imageUrlObject = rawImageUrl ? new URL(rawImageUrl, window.location.href) : null;
    if (imageUrlObject) imageUrlObject.searchParams.set("v", "local2");
    const imageUrl = imageUrlObject ? imageUrlObject.href : "";
    const source = window.localAnimalImageSources &&
      window.localAnimalImageSources.find(d => d.node === imageKey);
    const position = getPosition(anchorElement);

    card
      .html(`
        <div style="padding:14px 16px 12px;">
          <button id="animal-card-close" style="float:right;border:0;background:#eeeeee;color:#111111;border-radius:50%;width:25px;height:25px;cursor:pointer;">x</button>
          <div style="font-size:12px;color:#666666;letter-spacing:1px;text-transform:uppercase;">${item.level || "Animal group"}</div>
          <div style="font-size:20px;font-weight:700;line-height:1.2;padding-right:32px;">${displayName}</div>
          ${item.taxonId ? `<div style="font-size:12px;color:#777777;margin-top:4px;">TaxonID: ${item.taxonId}</div>` : ""}
          ${item.filterName ? `<div style="font-size:12px;color:#777777;margin-top:4px;">Group: ${item.filterName}</div>` : ""}
        </div>
        <div style="height:205px;background:#f1f1f1;display:flex;align-items:center;justify-content:center;color:#666666;font-size:13px;">
          ${imageUrl
            ? `<img src="${imageUrl}" alt="${displayName}" style="width:100%;height:100%;object-fit:cover;display:block;">`
            : `<div style="padding:18px;text-align:center;">Image unavailable</div>`}
        </div>
        <div style="padding:12px 16px 16px;font-size:12px;line-height:1.45;color:#333333;">
          ${source ? `<span style="color:#777777;">${source.source}</span>` : ""}
        </div>
      `)
      .style("left", `${position.left}px`)
      .style("top", `${position.top}px`)
      .style("opacity", 1)
      .style("transform", "translateY(0) scale(1)");

    d3.select("#animal-card-close").on("click", function (event) {
      event.stopPropagation();
      closeCard();
    });
  }

  function normalizeName(value) {
    return String(value || "").trim().toUpperCase();
  }

  function applyHighlight(selection, selectedName) {
    if (!selectedName) {
      selection
        .style("opacity", null)
        .style("filter", null)
        .attr("stroke-width", null);
      return;
    }

    selection.each(function (d) {
      const currentName = normalizeName(
        d && d.name ? d.name :
        d && d.data && d.data.name ? d.data.name :
        d && d.class_name ? d.class_name :
        ""
      );
      const isMatch = currentName === selectedName;

      d3.select(this)
        .style("opacity", isMatch ? 1 : 0.22)
        .style("filter", isMatch ? "drop-shadow(0 0 9px rgba(255,77,77,0.9))" : null);
    });
  }

  function broadcastSelection(item) {
    state.selected = item || null;
    const selectedName = normalizeName(item && (item.filterName || item.name));
    window.CrossGraphLastSelection = {
      item: state.selected,
      selectedName: selectedName,
      time: Date.now()
    };
    window.dispatchEvent(new CustomEvent("crossGraphSelect", {
      detail: {
        item: state.selected,
        selectedName: selectedName
      }
    }));

    // ==================== SANKEY IFRAME CROSS GRAPH HOOK START ====================
    const sankeyFrame = document.querySelector("#sankey-container iframe");
    if (sankeyFrame && sankeyFrame.contentWindow) {
      sankeyFrame.contentWindow.postMessage({
        type: "crossGraphSelect",
        item: state.selected,
        selectedName: selectedName
      }, window.location.origin);

      if (typeof sankeyFrame.contentWindow.focusSankeyNode === "function") {
        sankeyFrame.contentWindow.focusSankeyNode(selectedName);
      }
    }
    // ==================== SANKEY IFRAME CROSS GRAPH HOOK END ====================

    // ==================== MAP CROSS GRAPH CONTROL START ====================
    if (item && item.source !== "map" && window.MapCrossGraph && typeof window.MapCrossGraph.focusClass === "function") {
      window.MapCrossGraph.focusClass(selectedName);
    }
    // ==================== MAP CROSS GRAPH CONTROL END ====================
  }

  window.CrossGraph = {
    select(item, anchorElement) {
      broadcastSelection(item);
      showImageCard(item, anchorElement);
    },
    clear() {
      state.selected = null;
      closeCard();
      broadcastSelection(null);
    },
    applyHighlight,
    normalizeName
  };

  document.addEventListener("click", function (event) {
    const cardNode = document.getElementById("animal-image-card");
    if (cardNode && !cardNode.contains(event.target)) {
      closeCard();
    }
  });

  window.addEventListener("message", function(event) {
    if (event.origin !== window.location.origin) return;
    const message = event.data || {};
    if (message.type !== "sankeySelect" || !message.item) return;
    broadcastSelection(message.item);
    const anchor = document.querySelector("#sankey-container") || document.body;
    showImageCard(message.item, anchor);
  });

  // ==================== MAP CROSS GRAPH HOOK START ====================
  // This hook intentionally does not modify js/map.js.
  // It only observes clicks on the existing map DOM and adds an outside visual pulse.
  const style = document.createElement("style");
  style.textContent = `
    @keyframes crossGraphPulse {
      0% { box-shadow: inset 0 0 50px rgba(0,0,0,0.5), 0 0 0 rgba(255,77,77,0); }
      45% { box-shadow: inset 0 0 50px rgba(0,0,0,0.5), 0 0 24px rgba(255,77,77,0.75); }
      100% { box-shadow: inset 0 0 50px rgba(0,0,0,0.5), 0 0 0 rgba(255,77,77,0); }
    }
    .cross-graph-pulse {
      animation: crossGraphPulse 700ms ease;
    }
  `;
  document.head.appendChild(style);

  function readMapSidebarSelection(anchorElement) {
    const sidebar = document.getElementById("map-sidebar");
    if (!sidebar || !sidebar.classList.contains("sidebar-active")) return;

    const speciesName = (document.getElementById("sb-name")?.innerText || "").trim();
    const taxonId = (document.getElementById("sb-id")?.innerText || "").trim();
    const className = (document.getElementById("sb-category")?.innerText || "").trim();

    if (!speciesName || speciesName === "unknown" || speciesName === "Unknown species") return;
    if (!className || className === "unknown" || className === "Unknown category") return;

    const item = {
      name: speciesName,
      displayName: speciesName,
      taxonId: taxonId,
      filterName: className,
      imageKey: className,
      level: "Species",
      source: "map"
    };

    broadcastSelection(item);
    showImageCard(item, anchorElement);
  }

  document.addEventListener("click", function(event) {
    const mapNode = event.target.closest && event.target.closest("#map-container");
    if (!mapNode) return;
    window.setTimeout(() => readMapSidebarSelection(mapNode), 80);
    window.setTimeout(() => readMapSidebarSelection(mapNode), 250);
  }, true);

  window.addEventListener("crossGraphSelect", function(event) {
    const selectedName = event.detail && event.detail.selectedName;
    const mapContainer = document.querySelector("#map-section .chart-container");
    if (!mapContainer || selectedName === "MAP") return;
    mapContainer.classList.remove("cross-graph-pulse");
    void mapContainer.offsetWidth;
    mapContainer.classList.add("cross-graph-pulse");
  });
  // ==================== MAP CROSS GRAPH HOOK END ====================
})();

// ==================== CROSS GRAPH + ANIMAL IMAGE POPUP END ====================
