// ==================== CROSS GRAPH + ANIMAL IMAGE POPUP START ====================
// Shared selection, cross-chart highlighting, and local animal images.

(function () {
  const cardWidth = 300;
  const cardHeight = 360;
  const gap = 14;

  const state = {
    selected: null,
    dragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0
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

  function classifyGroup(value) {
    const group = normalizeName(value);
    if (["ACTINOPTERYGII", "CICHLIDAE", "CICHLIFORMES", "CYPRINIDAE", "LEUCISCIDAE", "SALMONIDAE", "CYPRINIFORMES", "SALMONIFORMES"].includes(group)) return "fish";
    if (["AVES", "ARDEIDAE", "ANATIDAE", "COLUMBIDAE", "FRINGILLIDAE", "MOHOIDAE", "MONARCHIDAE", "PSITTACIDAE", "RALLIDAE", "SCOLOPACIDAE", "STRIGIDAE", "STURNIDAE", "TURDIDAE", "ZOSTEROPIDAE", "PASSERIFORMES", "PSITTACIFORMES", "GRUIFORMES", "PELECANIFORMES", "STRIGIFORMES", "CHARADRIIFORMES", "ANSERIFORMES", "COLUMBIFORMES"].includes(group)) return "bird";
    if (["MAMMALIA", "CRICETIDAE", "RODENTIA"].includes(group)) return "mammal";
    if (["REPTILIA", "SCINCIDAE", "SQUAMATA"].includes(group)) return "reptile";
    if (["AMPHIBIA", "BUFONIDAE", "RHACOPHORIDAE", "ANURA"].includes(group)) return "amphibian";
    if (["GASTROPODA", "MOLLUSCA", "BYTHINELLIDAE", "CERASTIDAE", "HYDROBIIDAE", "PARTULIDAE", "PLEUROCERIDAE", "LITTORINIMORPHA", "SORBEOCONCHA", "STYLOMMATOPHORA"].includes(group)) return "mollusk";
    if (["INSECTA", "CARABIDAE", "COLEOPTERA"].includes(group)) return "insect";
    if (["ARACHNIDA", "ARANEAE", "OPILIONES", "PODOCTIDAE", "SPARASSIDAE"].includes(group)) return "arachnid";
    return "group";
  }

  function genericGroupIcon(groupName) {
    const type = classifyGroup(groupName);
    const label = type === "group" ? "GROUP" : type.toUpperCase();
    const symbols = {
      fish: '<path d="M62 105c34-31 76-34 122-4l32-26v89l-32-26c-46 30-88 27-122-4l-34 25V80l34 25z" fill="#263238"/><circle cx="78" cy="118" r="5" fill="#f7f7f7"/><path d="M132 94c8 13 8 35 0 48" stroke="#f7f7f7" stroke-width="5" fill="none" opacity=".55"/>',
      bird: '<path d="M42 126c48-46 86-49 133-9 19-2 32-10 42-27-1 45-26 72-73 80-37 6-72-10-102-44z" fill="#263238"/><path d="M82 121c33-30 62-36 93-17-45 12-75 29-107 58 2-16 6-29 14-41z" fill="#f7f7f7" opacity=".55"/><circle cx="185" cy="111" r="4" fill="#f7f7f7"/>',
      mammal: '<circle cx="89" cy="87" r="18" fill="#263238"/><circle cx="130" cy="74" r="19" fill="#263238"/><circle cx="170" cy="89" r="18" fill="#263238"/><circle cx="103" cy="137" r="22" fill="#263238"/><circle cx="155" cy="137" r="22" fill="#263238"/><ellipse cx="129" cy="139" rx="42" ry="37" fill="#263238"/>',
      reptile: '<path d="M48 134c38-38 89-42 136-16l29-23c-4 31-24 52-60 63-40 12-76 2-105-24z" fill="#263238"/><path d="M73 128c25-12 57-12 96 1" stroke="#f7f7f7" stroke-width="6" fill="none" opacity=".5"/><circle cx="189" cy="113" r="4" fill="#f7f7f7"/>',
      amphibian: '<ellipse cx="130" cy="125" rx="51" ry="38" fill="#263238"/><circle cx="101" cy="92" r="21" fill="#263238"/><circle cx="159" cy="92" r="21" fill="#263238"/><circle cx="101" cy="89" r="5" fill="#f7f7f7"/><circle cx="159" cy="89" r="5" fill="#f7f7f7"/><path d="M89 145c24 16 55 16 80 0" stroke="#f7f7f7" stroke-width="5" fill="none" opacity=".55"/>',
      mollusk: '<path d="M68 143c15-42 49-68 90-62 35 5 58 31 55 62H68z" fill="#263238"/><path d="M86 135c16-24 36-35 61-32 22 3 37 15 46 32" stroke="#f7f7f7" stroke-width="6" fill="none" opacity=".55"/><path d="M43 152h169" stroke="#263238" stroke-width="15" stroke-linecap="round"/>',
      insect: '<ellipse cx="130" cy="126" rx="28" ry="44" fill="#263238"/><ellipse cx="91" cy="115" rx="29" ry="41" fill="#263238" opacity=".82"/><ellipse cx="169" cy="115" rx="29" ry="41" fill="#263238" opacity=".82"/><path d="M55 85l151 82M205 85L54 167" stroke="#263238" stroke-width="6" stroke-linecap="round"/>',
      arachnid: '<ellipse cx="130" cy="122" rx="40" ry="32" fill="#263238"/><circle cx="130" cy="83" r="22" fill="#263238"/><path d="M92 111H42M94 130H40M168 111h50M166 130h52M98 95L53 62M162 95l45-33M98 146l-42 34M162 146l42 34" stroke="#263238" stroke-width="7" stroke-linecap="round"/>',
      group: '<circle cx="130" cy="118" r="56" fill="#263238"/><path d="M102 118h56M130 90v56" stroke="#f7f7f7" stroke-width="9" stroke-linecap="round" opacity=".7"/>'
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 205"><rect width="260" height="205" fill="#f1f1f1"/><g transform="translate(0 8)">${symbols[type]}</g><text x="130" y="188" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#666" letter-spacing="1.5">${label}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function isSameName(a, b) {
    return normalizeName(a) === normalizeName(b);
  }

  function startDrag(event) {
    const cardNode = card.node();
    if (!cardNode || event.target.id === "animal-card-close") return;
    const rect = cardNode.getBoundingClientRect();
    state.dragging = true;
    state.dragOffsetX = event.clientX - rect.left;
    state.dragOffsetY = event.clientY - rect.top;
    card.style("transition", "none");
    event.preventDefault();
    event.stopPropagation();
  }

  function dragCard(event) {
    if (!state.dragging) return;
    const left = Math.max(gap, Math.min(window.innerWidth - cardWidth - gap, event.clientX - state.dragOffsetX));
    const top = Math.max(gap, Math.min(window.innerHeight - cardHeight - gap, event.clientY - state.dragOffsetY));
    card
      .style("left", `${left}px`)
      .style("top", `${top}px`);
  }

  function stopDrag() {
    if (!state.dragging) return;
    state.dragging = false;
    card.style("transition", "opacity 180ms ease, transform 180ms ease");
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
    const source = window.localAnimalImageSources &&
      window.localAnimalImageSources.find(d => d.node === imageKey);
    const matchedSpeciesImage = source && source.level === "Species" &&
      (isSameName(imageKey, item.name) || isSameName(imageKey, item.displayName));
    const usesParentFallback = item.level === "Species" && rawImageUrl && !matchedSpeciesImage;
    let imageUrl = "";
    if (usesParentFallback) {
      imageUrl = genericGroupIcon(imageKey || item.filterName);
    } else {
      const imageUrlObject = rawImageUrl ? new URL(rawImageUrl, window.location.href) : null;
      if (imageUrlObject) imageUrlObject.searchParams.set("v", "local3");
      imageUrl = imageUrlObject ? imageUrlObject.href : "";
    }
    const position = getPosition(anchorElement);

    card
      .html(`
        <div id="animal-card-drag" style="padding:14px 16px 12px;cursor:move;user-select:none;">
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
          ${usesParentFallback ? `<span style="color:#777777;">Image unavailable; showing parent group image.</span>` : ""}
          ${!usesParentFallback && source ? `<span style="color:#777777;">${source.source}</span>` : ""}
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
    d3.select("#animal-card-drag").on("mousedown", startDrag);
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
  document.addEventListener("mousemove", dragCard);
  document.addEventListener("mouseup", stopDrag);

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
