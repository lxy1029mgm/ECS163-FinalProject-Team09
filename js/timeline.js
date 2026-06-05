// Logan's multiline graph for the timeline section

const multiline_config = {
    csvFile: "extinction.csv",
    startYear: 2010,
    endYear: 2025,
    lines: [
        { key: "TOTAL", label: "All extinction records", color: "#24527a" },
        { key: "AVES", label: "Birds", color: "#c45f2d" },
        { key: "GASTROPODA", label: "Mollusks", color: "#6c8f3a" },
        { key: "ACTINOPTERYGII", label: "Fish", color: "#566fb2" },
        { key: "AMPHIBIA", label: "Amphibians", color: "#a95883" },
        { key: "MAMMALIA", label: "Mammals", color: "#8a6e3a" }
    ],
    startingLines: ["TOTAL", "AVES", "GASTROPODA", "ACTINOPTERYGII", "AMPHIBIA", "MAMMALIA"]
};

let allLineData = [];
let allRows = [];
let activeLines = multiline_config.startingLines.slice();

const margin = { top: 35, right: 35, bottom: 55, left: 65 };
const detailsPageSize = 6;

document.addEventListener("DOMContentLoaded", function(){
    draw_multiline_graph();
});

function draw_multiline_graph(){
    d3.csv(multiline_config.csvFile).then(function(data){
        allRows = data;
        allLineData = makeLineData(data);
        makeControls();
        drawChart();

        window.addEventListener("resize", function(){
            drawChart();
        });
    });
}

function makeLineData(data){
    const years = d3.range(multiline_config.startYear, multiline_config.endYear + 1);

    return multiline_config.lines.map(function(line){
        const values = years.map(function(year){
            const count = data.filter(function(row){
                const rowYear = +row.yearPublished;
                const isExtinct = row.category === "EX" || row.redlistCategory === "Extinct";

                if(line.key === "TOTAL"){
                    return rowYear === year && isExtinct;
                }

                return rowYear === year && isExtinct && row.class_name === line.key;
            }).length;

            return {
                year: year,
                count: count
            };
        });

        return {
            key: line.key,
            label: line.label,
            color: line.color,
            values: values
        };
    });
}

function makeControls(){
    const controls = d3.select("#multiline-controls");
    controls.selectAll("*").remove();

    const labels = controls.selectAll("label")
        .data(multiline_config.lines)
        .enter()
        .append("label")
        .attr("class", "line-control");

    labels.append("input")
        .attr("type", "checkbox")
        .property("checked", function(d){
            return activeLines.indexOf(d.key) !== -1;
        })
        .on("change", function(event, d){
            const checkbox = this;

            if(checkbox.checked){
                activeLines.push(d.key);
            } else {
                activeLines = activeLines.filter(function(key){
                    return key !== d.key;
                });
            }

            drawChart();
        });

    labels.append("span")
        .attr("class", "line-color")
        .style("background-color", function(d){
            return d.color;
        });

    labels.append("span")
        .text(function(d){
            return d.label;
        });
}

function drawChart(){
    const svg = d3.select("#multiline-chart");
    const tooltip = d3.select("#multiline-tooltip");

    svg.selectAll("*").remove();

    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const visibleData = allLineData.filter(function(line){
        return activeLines.indexOf(line.key) !== -1;
    });

    const maxCount = d3.max(visibleData, function(line){
        return d3.max(line.values, function(d){
            return d.count;
        });
    }) || 1;

    const xScale = d3.scaleLinear()
        .domain([multiline_config.startYear, multiline_config.endYear])
        .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, maxCount])
        .nice()
        .range([chartHeight, 0]);

    const chart = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    chart.append("g")
        .attr("class", "chart-grid")
        .call(d3.axisLeft(yScale).tickSize(-chartWidth).tickFormat(""));

    chart.append("g")
        .attr("class", "chart-axis")
        .attr("transform", "translate(0," + chartHeight + ")")
        .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("d")));

    chart.append("g")
        .attr("class", "chart-axis")
        .call(d3.axisLeft(yScale));

    chart.append("text")
        .attr("class", "axis-title")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 42)
        .attr("text-anchor", "middle")
        .text("IUCN assessment year");

    chart.append("text")
        .attr("class", "axis-title")
        .attr("x", -chartHeight / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of extinct species records");

    const lineMaker = d3.line()
        .x(function(d){
            return xScale(d.year);
        })
        .y(function(d){
            return yScale(d.count);
        });

    const lineGroups = chart.selectAll(".line-group")
        .data(visibleData)
        .enter()
        .append("g")
        .attr("class", "line-group");

    lineGroups.append("path")
        .attr("class", "line-path")
        .attr("d", function(d){
            return lineMaker(d.values);
        })
        .attr("stroke", function(d){
            return d.color;
        });

    lineGroups.selectAll("circle")
        .data(function(line){
            return line.values.map(function(value){
                return {
                    key: line.key,
                    label: line.label,
                    color: line.color,
                    year: value.year,
                    count: value.count
                };
            });
        })
        .enter()
        .append("circle")
        .attr("class", "line-dot")
        .attr("cx", function(d){
            return xScale(d.year);
        })
        .attr("cy", function(d){
            return yScale(d.count);
        })
        .attr("r", 4)
        .attr("fill", function(d){
            return d.color;
        })
        .on("mousemove", function(event, d){
            const mouse = d3.pointer(event, d3.select(".chart-holder").node());

            tooltip
                .style("opacity", 1)
                .style("left", (mouse[0] + 14) + "px")
                .style("top", (mouse[1] - 20) + "px")
                .html("<strong>" + d.label + "</strong>" + d.year + ": " + d.count + " records");
        })
        .on("mouseleave", function(){
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d){
            showSpeciesDetails(d);
        });

    addPeakNote(chart, visibleData, xScale, yScale, chartHeight);
}

function showSpeciesDetails(dotData){
    const detailsBox = d3.select("#species-details");

    const matchingRows = allRows.filter(function(row){
        const rowYear = +row.yearPublished;
        const isExtinct = row.category === "EX" || row.redlistCategory === "Extinct";

        if(dotData.key === "TOTAL"){
            return rowYear === dotData.year && isExtinct;
        }

        return rowYear === dotData.year && isExtinct && row.class_name === dotData.key;
    });

    detailsBox.selectAll("*").remove();

    detailsBox.append("h3")
        .text(dotData.label + " in " + dotData.year);

    detailsBox.append("p")
        .text(matchingRows.length + " species records assessed as extinct in this year/group.");

    if(matchingRows.length === 0){
        detailsBox.append("p")
            .attr("class", "empty-details")
            .text("No species records found for this point.");
        return;
    }

    const sortedRows = matchingRows
        .sort(function(a, b){
            return countKnownFields(b) - countKnownFields(a);
        });

    const pageArea = detailsBox.append("div")
        .attr("class", "species-page-area");

    showSpeciesPage(pageArea, sortedRows, 0);
}

function showSpeciesPage(pageArea, rows, pageNumber){
    const totalPages = Math.ceil(rows.length / detailsPageSize);
    const startIndex = pageNumber * detailsPageSize;
    const rowsToShow = rows.slice(startIndex, startIndex + detailsPageSize);

    pageArea.selectAll("*").remove();

    const list = pageArea.append("div")
        .attr("class", "species-list");

    const cards = list.selectAll(".species-card")
        .data(rowsToShow)
        .enter()
        .append("div")
        .attr("class", "species-card");

    cards.append("h4")
        .text(function(row){
            if(row.main_common_name){
                return row.main_common_name;
            }
            return row.scientificName || row.scientific_name || "Unknown species";
        });

    cards.append("p")
        .attr("class", "scientific-name")
        .text(function(row){
            return row.scientificName || row.scientific_name || "Scientific name not listed";
        });

    cards.each(function(row){
        const card = d3.select(this);
        let detailCount = 0;

        detailCount += addDetailLine(card, "Location", row.location_detail_clean || row.location_clean);
        detailCount += addDetailLine(card, "Main threat", row.main_threat_clean);
        detailCount += addDetailLine(card, "Last seen", row.yearLastSeen);

        if(detailCount === 0){
            card.append("p")
                .attr("class", "limited-details")
                .text("Extra details are limited for this record.");
        }
    });

    if(totalPages > 1){
        const pageControls = pageArea.append("div")
            .attr("class", "page-controls");

        pageControls.append("button")
            .attr("type", "button")
            .attr("disabled", pageNumber === 0 ? true : null)
            .text("Previous")
            .on("click", function(){
                showSpeciesPage(pageArea, rows, pageNumber - 1);
            });

        pageControls.append("span")
            .text("Page " + (pageNumber + 1) + " of " + totalPages);

        pageControls.append("button")
            .attr("type", "button")
            .attr("disabled", pageNumber === totalPages - 1 ? true : null)
            .text("Next")
            .on("click", function(){
                showSpeciesPage(pageArea, rows, pageNumber + 1);
            });
    }
}

function addDetailLine(card, label, value){
    if(!hasKnownValue(value)){
        return 0;
    }

    card.append("p")
        .text(function(){
            return label + ": " + value;
        });

    return 1;
}

function countKnownFields(row){
    let total = 0;

    if(hasKnownValue(row.location_detail_clean || row.location_clean)){
        total += 1;
    }

    if(hasKnownValue(row.main_threat_clean)){
        total += 1;
    }

    if(hasKnownValue(row.yearLastSeen)){
        total += 1;
    }

    return total;
}

function hasKnownValue(value){
    return cleanText(value) !== "Unknown";
}

function cleanText(value){
    if(value === "" || value === undefined || value === null){
        return "Unknown";
    }

    return value;
}

function addPeakNote(chart, visibleData, xScale, yScale, chartHeight){
    const totalLine = visibleData.find(function(line){
        return line.key === "TOTAL";
    });

    if(!totalLine){
        return;
    }

    const peak = totalLine.values.reduce(function(best, current){
        if(current.count > best.count){
            return current;
        }
        return best;
    });

    chart.append("line")
        .attr("class", "peak-line")
        .attr("x1", xScale(peak.year))
        .attr("x2", xScale(peak.year))
        .attr("y1", yScale(peak.count))
        .attr("y2", chartHeight);

    chart.append("text")
        .attr("class", "peak-text")
        .attr("x", xScale(peak.year) - 8)
        .attr("y", yScale(peak.count) - 12)
        .attr("text-anchor", "end")
        .text("Highest total: " + peak.count + " records in " + peak.year);
}
