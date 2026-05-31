// Claim d3 and d3-sankey for intellisense (error checking & prompt)
/**@typedef {import('d3')} */
/**
 * @typedef {import('topojson')}
 * @typedef {import('echarts')}
 */



//import config, easy to manage and modified if needed, makes file organized
import { map_config } from '../config/map_config.js';


//export function for other js to import, also for modular
export function draw_map(){
    d3.csv(map_config.data_path).then(async raw_data => {
        const continent_data = await d3.csv(map_config.continent_path);
        console.log("map_raw_data", raw_data);

        //Non user modified settings/ variables
        const NTaxon_id_col = map_config.NTaxon_id_col;
        const NLocation_col = map_config.NLocation_col;
        const NCountry_code_col = map_config.NCountry_code_col;

        //data processing
        const filtered_data = raw_data.map(item => ({
            [NTaxon_id_col]: item[NTaxon_id_col],
            [NLocation_col]: item[NLocation_col],
            [NCountry_code_col]: item[NCountry_code_col]
        }));

        //prepare countries list to link the name in map
        filtered_data.forEach(item => {
            const target = continent_data.find(d => d[map_config.NCountry_alpha_col] === item[NCountry_code_col]);
            item[NCountry_code_col] = target ? target[NCountry_code_col] : -1;
        });
        console.log("map_filtered_data", filtered_data);
        

        const map_url = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
        const world_data = await d3.json(map_url);
        console.log("world_data", world_data);
        const countries_data = topojson.feature(world_data, world_data.objects.countries);

        console.log("continent data", continent_data);
        console.log("countries data", countries_data);

        //processing countries to land
        const continent_list = new Set();
        const countries_to_land = [];
        continent_data.forEach(item => {
            const region_code = item[map_config.NRegion_code_col];
            if(!continent_list.has(region_code)){
                countries_to_land.push({
                    "region-code": region_code,
                    "country-set": new Set(),
                    "region-name": item[map_config.NRegion_name_col]
                });
                continent_list.add(region_code);
            }
            const target = countries_to_land.find(region => region["region-code"] === region_code);
            target["country-set"].add(item[map_config.NCountry_code_col]);
        });

        console.log("countries in region", countries_to_land)

        const processed_data = [];
        const processed_class = new Set();
        let max_extinct = 0;
        filtered_data.forEach(item => {
            if(!processed_class.has(item[NCountry_code_col])){
                processed_data.push({
                    "country_id": item[NCountry_code_col],
                    "num_extinct": 0
                });
                processed_class.add(item[NCountry_code_col]);
            }
            const target = processed_data.find(d => d["country_id"] === item[NCountry_code_col]);
            target["num_extinct"] ++;
            if(target["num_extinct"] > max_extinct){
                max_extinct = target["num_extinct"];
            }
        });

        console.log("processed_data", processed_data);

        draw_graph();
        window.addEventListener("resize", draw_graph);
        function draw_graph(){
            const rect_name = map_config.class_name;
            d3.selectAll(rect_name).selectAll("*").remove();

            const rect = document.querySelector(rect_name).getBoundingClientRect();

            const width = rect.width; //should dynamically adjust after html is implemented
            const height = rect.height;

            const margin = {top: 40, bottom: 50, left: 60, right: 140};

            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            const svg = d3.selectAll(rect_name).append("svg").attr("viewBox", [0, 0, width, height])

            // config color
            const color = d3.scaleSymlog()
            .domain([0, max_extinct])
            .range(["#2cba00", "#a30000"]);

            // config projection
            const projection = d3.geoMercator()
            .fitSize([width, height], countries_data);

            const path = d3.geoPath().projection(projection);

            // config map
            const world_map = svg.selectAll("path")
            .data(countries_data.features)
            .join("path")
            .attr("class", "world_map")
            .attr("d", path)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", d => {
                const value = processed_data.find(cell => cell.country_id === d.id);
                return value ? color(value["num_extinct"]) : "#FFFFFF";
            });

            world_map.append("title")
            .text(d => {
                const target = processed_data.find(cell => cell.country_id === d.id);
                const country_id = target ? target.country_id : null
                const country_target = continent_data.find(country => country[NCountry_code_col] === country_id)
                return `Country: ${country_target ? country_target["name"]: null}\nNum_Extinction: ${target ? target["num_extinct"] : null}`
            })

            // zoom
            const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                world_map.attr("transform", event.transform);
            });
    

            //config information
            svg.append("text")
            .attr("transform", `translate(45, ${margin.top + innerHeight / 2}) rotate(-90)`)
            .attr("text-anchor", "middle")
            .attr("font-size", 15)
            .attr("fill", "Black")
            .text("Geological graph with extinction situation");

            // config Legend
            const legend = svg.append("defs");

            const gradient = legend.append("linearGradient")
            .attr("id", "numExtinct")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 1)
            .attr("y2", 0);

            gradient.append("stop").attr("offset", "0%").attr("stop-color", "red");
            gradient.append("stop").attr("offset", "100%").attr("stop-color", "green");

            svg.append("rect")
            .attr("fill", "url(#numExtinct)")
            .attr("width", 20)
            .attr("height", 60)
            .attr("transform", `translate(${width - margin.right + 4}, ${margin.top})`);

            // print description of legend
            svg.append("text")
            .attr("x", width - margin.right + 30)
            .attr("y", 45)
            .attr("font-size", 9)
            .attr("fill", "green")
            .text("Low Extinction");

            svg.append("text")
            .attr("x", width - margin.right + 30)
            .attr("y", 95)
            .attr("font-size", 9)
            .attr("fill", "red")
            .text("High Extinction");


            svg.call(zoom);
            return svg.node();
        }
    });


}