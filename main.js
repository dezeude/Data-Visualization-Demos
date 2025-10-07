import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as midi from './midi.js'

let clusterBtn = document.getElementById('cluster');
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

const minRange = 1000;
const maxRange = 1_000_000;
const byteRange = parseInt(prompt(`Enter the Byte Range: a value between ${minRange} and ${maxRange}`));

if (byteRange < minRange || byteRange > maxRange) {
    alert('Error with input! Please try again..')
    throw new Error(`Input must be between ${minRange} and ${maxRange}`);
};

init()
async function init() {
    midi.getPermission()
    await navigator.requestMIDIAccess().then((midiAccess) => {
        d3.csv("res/xyz_gaussian_clusters250129.csv", { headers: { "Range": `bytes = 0 - ${byteRange}` } }, d3.autoType).then(async function (rawData) {
            let data = rawData.map(d => ({
                x: d[Object.keys(d)[1]],
                y: d[Object.keys(d)[2]]
            }));
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

            let k = 3;

            // Add dots
            svg.append('g')
                .selectAll("dot")
                .data(data)
                .join("circle")
                .attr("cx", d => x(d.x))
                .attr("cy", d => y(d.y))
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
                    .attr("cx", d => x(d.x))
                    .attr("cy", d => y(d.y))
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
                    .attr("cx", d => x(d.x))
                    .attr("cy", d => y(d.y))
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

            function drawkMeans(data, assignments = [], centroids = []) {
                svg.selectAll("circle").remove();
                svg.selectAll("rect").remove();

                let color = d3.scaleOrdinal(d3.schemeCategory10);

                // Plot data points
                svg.selectAll("circle")
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("cx", d => x(d.x))
                    .attr("cy", d => y(d.y))
                    .attr("r", psize)
                    .style("fill", (d, i) => assignments.length ? color(assignments[i]) : "#69b3a2");

                // Plot centroids
                svg.selectAll("rect")
                    .data(centroids)
                    .enter()
                    .append("rect")
                    .attr("x", d => x(d.x) - 5)
                    .attr("y", d => y(d.y) - 5)
                    .attr("width", 10)
                    .attr("height", 10)
                    .attr("fill", "black");
            }

            function kMeansClustering(data, k, maxIterations = 100) {
                console.log('here')
                console.log(data)
                console.log(k)
                let centroids = data.slice(0).sort(() => Math.random() - 0.5).slice(0, k);
                let assignments = new Array(data.length);
                let converged = false;
                let iterations = 0;

                while (!converged && iterations < maxIterations) {
                    converged = true;

                    // Assign points to nearest centroid
                    for (let i = 0; i < data.length; i++) {
                        let minDist = Infinity, clusterIndex = -1;
                        for (let j = 0; j < k; j++) {
                            let dist = Math.hypot(data[i].x - centroids[j].x, data[i].y - centroids[j].y);
                            if (dist < minDist) {
                                minDist = dist;
                                clusterIndex = j;
                            }
                        }
                        if (assignments[i] !== clusterIndex) {
                            assignments[i] = clusterIndex;
                            converged = false;
                        }
                    }

                    // Compute new centroids
                    let newCentroids = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));
                    console.log(newCentroids)
                    for (let i = 0; i < data.length; i++) {
                        let clusterIndex = assignments[i];
                        newCentroids[clusterIndex].x += data[i].x;
                        newCentroids[clusterIndex].y += data[i].y;
                        newCentroids[clusterIndex].count++;
                    }
                    for (let j = 0; j < k; j++) {
                        if (newCentroids[j].count > 0) {
                            centroids[j] = {
                                x: newCentroids[j].x / newCentroids[j].count,
                                y: newCentroids[j].y / newCentroids[j].count
                            };
                        }
                    }

                    iterations++;
                }
                return { centroids, assignments };
            }

            clusterBtn.addEventListener('click', () => {
                let { centroids, assignments } = kMeansClustering(data, k);
                drawkMeans(data, assignments, centroids);
            });


            //MIDI Input Mapping
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
                else if (event.data[0] === 0xe0 && event.data[1] === 0x0) {
                    console.log(k)
                    let new_height = event.data[2];
                    let diff = (new_height - last_height) * delta;
                    k += diff;
                    if (k < 0) k = 0;
                    kValEl.value = k;
                    last_height = new_height;
                    // updateColors(k);
                    let { centroids, assignments } = kMeansClustering(data, k);
                    drawkMeans(data, assignments, centroids);
                }
            })


        });
    })

}
