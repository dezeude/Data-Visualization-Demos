import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as midi from './midi.js'


// set the dimensions and margins of the graph
const margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        `translate(${margin.left}, ${margin.top})`);

let byteRange = 1000;
init()
async function init() {
    midi.getPermission()
    await navigator.requestMIDIAccess().then((midiAccess) => {
        d3.csv("res/xyz_gaussian_clusters250129.csv", { headers: { "Range": `bytes = 0 - ${byteRange}` } }, d3.autoType).then(async function (data) {
            data = data.map((d) => [
                d[Object.keys(d)[1]],
                d[Object.keys(d)[2]],
            ]);
            console.log(data)
            let xRange = [3, 2000];
            let yRange = [0, 2000];
            let psize = 5;
            // Add X axis
            const x = d3.scaleLinear()
                .domain(xRange)
                .range([0, width]);
            const xAxis = svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x));

            // Add Y axis
            const y = d3.scaleLinear()
                .domain(yRange)
                .range([height, 0]);
            const yAxis = svg.append("g")
                // .attr("transform", `translate(0, ${width})`)
                .call(d3.axisLeft(y));

            // Add dots
            svg.append('g')
                .selectAll("dot")
                .data(data)
                .join("circle")
                .attr("cx", (d) => x(d[0]))
                .attr("cy", (d) => y(d[1]))
                .attr("r", psize)
                .style("fill", "#69b3a2")


            //attached to input element
            function updateXRange(value = [0, 0]) {
                // Get the value of the button
                if (value.length !== 2) {
                    return "Array must have exactly two elements.";
                }

                const [vx, vy] = value;
                const [r1, r2] = xRange;

                xRange = [vx + r1, vy + r2];

                // Update X axis
                x.domain(xRange)
                xAxis.transition().duration(1000).call(d3.axisBottom(x))

                // Update chart
                svg.selectAll("circle")
                    .data(data)
                    // .transition()
                    // .duration(0)
                    .attr("cx", (d) => x(d[0]))
                    .attr("cy", (d) => y(d[1]))
            }

            //attached to input element
            function updateYRange(value = [0, 0]) {
                // Get the value of the button
                if (value.length !== 2) {
                    return "Array must have exactly two elements.";
                }

                const [vx, vy] = value;
                const [r1, r2] = yRange;

                yRange = [vx + r1, vy + r2];

                // Update Y axis
                y.domain(yRange)
                yAxis.transition().duration(1000).call(d3.axisLeft(y))

                // Update chart
                svg.selectAll("circle")
                    .data(data)
                    // .transition()
                    // .duration(0)
                    .attr("cx", (d) => x(d[0]))
                    .attr("cy", (d) => y(d[1]))
            }

            function updatePointSize(value = 1) {
                // Get the value of the button
                psize += value

                // Update chart
                svg.selectAll("circle")
                    .data(data)
                    // .transition()
                    // .duration(0)
                    .attr("r", psize)
            }

            // await console.log(navigator.userAgent)
            console.log(midiAccess)
            midi.listInputsAndOutputs(midiAccess);
            let delta = 1;
            midi.startLoggingMIDIInput(midiAccess, (event) => {
                console.log(event.data)
                // TODO: Use Hashmap for all control bindings.
                if (event.data[0] === 0xb0) {
                    //turn knobs

                    if (event.data[1] == 0x10) {
                        //x-min
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updateXRange([-delta, 0]);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updateXRange([delta, 0]);
                        }

                    }
                    else if (event.data[1] == 0x11) {
                        //x-max
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updateXRange([0, -delta]);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updateXRange([0, delta]);
                        }
                    }

                    else if (event.data[1] == 0x12) {
                        //y-min
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updateYRange([-delta, 0]);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updateYRange([delta, 0]);
                        }
                    }
                    else if (event.data[1] == 0x13) {
                        //y-max
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updateYRange([0, -delta]);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updateYRange([0, delta]);
                        }
                    }
                    else if (event.data[1] == 0x14) {
                        //size of dots
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updatePointSize(-1);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updatePointSize(1);
                        }
                    }
                }
                else if (event.data[0] === 0xe7 && event.data[1] === 0x0) {
                    delta = event.data[2];
                }
            })


        });
    })

}
