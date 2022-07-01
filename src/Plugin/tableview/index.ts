/**
 * Copyright (c) 2021 ~ present NAVER Corp.
 * billboard.js project is licensed under the MIT license
 */
import Plugin from "../Plugin";
import Options from "./Options";
import {defaultStyle, tpl} from "./const";
import {loadConfig} from "../../config/config";
import {isNumber, tplProcess} from "../../module/util";

/**
 * Table view plugin.<br>
 * Generates table view for bound dataset.
 * - **NOTE:**
 *   - Plugins aren't built-in. Need to be loaded or imported to be used.
 *   - Non required modules from billboard.js core, need to be installed separately.
 * @class plugin-tableview
 * @param {object} options table view plugin options
 * @augments Plugin
 * @returns {TableView}
 * @example
 * // Plugin must be loaded before the use.
 * <script src="$YOUR_PATH/plugin/billboardjs-plugin-tableview.js"></script>
 *
 *  var chart = bb.generate({
 *     ...
 *     plugins: [
 *        new bb.plugin.tableview({
 *          selector: "#my-table-view",
 *          categoryTitle: "Category",
 *          categoryFormat: function(v) {
 *              // do some transformation
 *              ...
 *              return v;
 *          },
 *          class: "my-class-name",
 *          style: true,
 *          title: "My Data List",
 *          updateOnToggle: false
 *        }),
 *     ]
 *  });
 * @example
 * import {bb} from "billboard.js";
 * import TableView from "billboard.js/dist/billboardjs-plugin-tableview";
 *
 * bb.generate({
 *     ...
 *     plugins: [
 *        new TableView({ ... })
 *     ]
 * })
 */
export default class TableView extends Plugin {
	private config;
	private element;

	constructor(options) {
		super(options);
		this.config = new Options();

		return this;
	}

	$beforeInit(): void {
		loadConfig.call(this, this.options);
	}

	$init(): void {
		const {class: className, selector, style} = this.config;
		let element = document.querySelector(
			selector || `.${className || defaultStyle.class}`
		);

		if (!element) {
			const chart = this.$$.$el.chart.node();

			element = document.createElement("table");
			chart.parentNode.insertBefore(element, chart.nextSibling);
		}

		if (element.tagName !== "TABLE") {
			const table = document.createElement("table");

			element.appendChild(table);
			element = table;
		}

		// append default css style
		if (style && !document.getElementById(defaultStyle.id)) {
			const s = document.createElement("style");

			s.id = defaultStyle.id;
			s.innerHTML = defaultStyle.rule;

			(document.head || document.getElementsByTagName("head")[0])
				.appendChild(s);
		}

		element.classList.add(...[style && defaultStyle.class, className].filter(Boolean));

		this.element = element;
	}

	/**
	 * Generate table
	 * @private
	 */
	generateTable(): void {
		const {$$, config, element} = this;
		const dataToShow = $$.filterTargetsToShow($$.data.targets);

		let thead = tplProcess(tpl.thead, {
			title: dataToShow.length ? this.config.categoryTitle : ""
		});
		let tbody = "";
		const rows: (number|string)[][] = [];

		dataToShow.forEach((v, k: number) => {
			thead += tplProcess(tpl.thead, {title: v.id});

			// make up value rows
			let j = 0;
			for (let i = 0, d; (d = v.values[i]); j++) {
				if (!rows[j]) {
					rows.push([d.x, ...Array(k).fill(""), d.value]);
					i++;
				} else {
					let x = rows[j][0];
					if (x > d.x) {
						rows.splice(j, 0, [d.x, ...Array(k).fill(""), d.value]);
						i++;
					} else if (x === d.x) {
						rows[j].push(d.value);
						i++;
					} else {
						rows[j].push("");
					}
				}
			}
			while (j < rows.length) {
				rows[j].push("");
				j++;
			}
		});

		rows.forEach(v => {
			tbody += `<tr>${
				v.map((d, i) => tplProcess(i ? tpl.tbody : tpl.tbodyHeader, {
					value: i === 0 ?
						config.categoryFormat.bind(this)(d) :
						(isNumber(d) ? d.toLocaleString() : "")
				})).join("")
			}</tr>`;
		});

		const r = tplProcess(tpl.body, {
			...config,
			title: config.title || $$.config.title_text || "",
			thead,
			tbody
		});

		element.innerHTML = r;
	}

	$redraw(): void {
		const {state} = this.$$;
		const doNotUpdate = state.resizing || (!this.config.updateOnToggle && state.toggling);

		!doNotUpdate && this.generateTable();
	}

	$willDestroy(): void {
		this.element.parentNode.removeChild(this.element);

		// remove default css style when left one chart instance
		if (this.$$.charts.length === 1) {
			const s = document.getElementById(defaultStyle.id);

			s?.parentNode?.removeChild(s);
		}
	}
}
