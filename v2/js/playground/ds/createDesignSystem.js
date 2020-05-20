define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDesignSystem = void 0;
    const el = (str, elementType, container) => {
        const el = document.createElement(elementType);
        el.innerHTML = str;
        container.appendChild(el);
        return el;
    };
    // The Playground Plugin design system
    exports.createDesignSystem = (sandbox) => {
        const ts = sandbox.ts;
        return (container) => {
            const clear = () => {
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            };
            let decorations = [];
            let decorationLock = false;
            /** Lets a HTML Element hover to highlight code in the editor  */
            const addEditorHoverToElement = (element, pos, config) => {
                element.onmouseenter = () => {
                    if (!decorationLock) {
                        const model = sandbox.getModel();
                        const start = model.getPositionAt(pos.start);
                        const end = model.getPositionAt(pos.end);
                        decorations = sandbox.editor.deltaDecorations(decorations, [
                            {
                                range: new sandbox.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                options: { inlineClassName: "highlight-" + config.type },
                            },
                        ]);
                    }
                };
                element.onmouseleave = () => {
                    if (!decorationLock) {
                        sandbox.editor.deltaDecorations(decorations, []);
                    }
                };
            };
            const localStorageOption = (setting) => {
                // Think about this as being something which you want enabled by default and can suppress whether
                // it should do something.
                const invertedLogic = setting.emptyImpliesEnabled;
                const li = document.createElement("li");
                const label = document.createElement("label");
                const split = setting.oneline ? "" : "<br/>";
                label.innerHTML = `<span>${setting.display}</span>${split}${setting.blurb}`;
                const key = setting.flag;
                const input = document.createElement("input");
                input.type = "checkbox";
                input.id = key;
                input.checked = invertedLogic ? !localStorage.getItem(key) : !!localStorage.getItem(key);
                input.onchange = () => {
                    if (input.checked) {
                        if (!invertedLogic)
                            localStorage.setItem(key, "true");
                        else
                            localStorage.removeItem(key);
                    }
                    else {
                        if (invertedLogic)
                            localStorage.setItem(key, "true");
                        else
                            localStorage.removeItem(key);
                    }
                    if (setting.onchange) {
                        setting.onchange(!!localStorage.getItem(key));
                    }
                };
                label.htmlFor = input.id;
                li.appendChild(input);
                li.appendChild(label);
                container.appendChild(li);
                return li;
            };
            const button = (settings) => {
                const join = document.createElement("input");
                join.type = "button";
                join.value = settings.label;
                if (settings.onclick) {
                    join.onclick = settings.onclick;
                }
                container.appendChild(join);
                return join;
            };
            const code = (code) => {
                const createCodePre = document.createElement("pre");
                const codeElement = document.createElement("code");
                codeElement.innerHTML = code;
                createCodePre.appendChild(codeElement);
                container.appendChild(createCodePre);
                return codeElement;
            };
            const showEmptyScreen = (message) => {
                clear();
                const noErrorsMessage = document.createElement("div");
                noErrorsMessage.id = "empty-message-container";
                const messageDiv = document.createElement("div");
                messageDiv.textContent = message;
                messageDiv.classList.add("empty-plugin-message");
                noErrorsMessage.appendChild(messageDiv);
                container.appendChild(noErrorsMessage);
                return noErrorsMessage;
            };
            const listDiags = (model, diags) => {
                const errorUL = document.createElement("ul");
                errorUL.className = "compiler-diagnostics";
                container.appendChild(errorUL);
                diags.forEach(diag => {
                    const li = document.createElement("li");
                    li.classList.add("diagnostic");
                    switch (diag.category) {
                        case 0:
                            li.classList.add("warning");
                            break;
                        case 1:
                            li.classList.add("error");
                            break;
                        case 2:
                            li.classList.add("suggestion");
                            break;
                        case 3:
                            li.classList.add("message");
                            break;
                    }
                    if (typeof diag === "string") {
                        li.textContent = diag;
                    }
                    else {
                        li.textContent = sandbox.ts.flattenDiagnosticMessageText(diag.messageText, "\n");
                    }
                    errorUL.appendChild(li);
                    if (diag.start && diag.length) {
                        addEditorHoverToElement(li, { start: diag.start, end: diag.start + diag.length }, { type: "error" });
                    }
                    li.onclick = () => {
                        if (diag.start && diag.length) {
                            const start = model.getPositionAt(diag.start);
                            sandbox.editor.revealLine(start.lineNumber);
                            const end = model.getPositionAt(diag.start + diag.length);
                            decorations = sandbox.editor.deltaDecorations(decorations, [
                                {
                                    range: new sandbox.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                    options: { inlineClassName: "error-highlight", isWholeLine: true },
                                },
                            ]);
                            decorationLock = true;
                            setTimeout(() => {
                                decorationLock = false;
                                sandbox.editor.deltaDecorations(decorations, []);
                            }, 300);
                        }
                    };
                });
                return errorUL;
            };
            const showOptionList = (options, style) => {
                const ol = document.createElement("ol");
                ol.className = style.style === "separated" ? "playground-options" : "playground-options tight";
                options.forEach(option => {
                    if (style.style === "rows")
                        option.oneline = true;
                    const settingButton = localStorageOption(option);
                    ol.appendChild(settingButton);
                });
                container.appendChild(ol);
            };
            const createASTTree = (node) => {
                const div = document.createElement("div");
                div.className = "ast";
                const infoForNode = (node) => {
                    const name = ts.SyntaxKind[node.kind];
                    return {
                        name,
                    };
                };
                const renderLiteralField = (key, value, info) => {
                    const li = document.createElement("li");
                    const typeofSpan = `ast-node-${typeof value}`;
                    let suffix = "";
                    if (key === "kind") {
                        suffix = ` (SyntaxKind.${info.name})`;
                    }
                    li.innerHTML = `${key}: <span class='${typeofSpan}'>${value}</span>${suffix}`;
                    return li;
                };
                const renderSingleChild = (key, value, depth) => {
                    const li = document.createElement("li");
                    li.innerHTML = `${key}: `;
                    renderItem(li, value, depth + 1);
                    return li;
                };
                const renderManyChildren = (key, nodes, depth) => {
                    const childers = document.createElement("div");
                    childers.classList.add("ast-children");
                    const li = document.createElement("li");
                    li.innerHTML = `${key}: [<br/>`;
                    childers.appendChild(li);
                    nodes.forEach(node => {
                        renderItem(childers, node, depth + 1);
                    });
                    const liEnd = document.createElement("li");
                    liEnd.innerHTML += "]";
                    childers.appendChild(liEnd);
                    return childers;
                };
                const renderItem = (parentElement, node, depth) => {
                    const itemDiv = document.createElement("div");
                    parentElement.appendChild(itemDiv);
                    itemDiv.className = "ast-tree-start";
                    itemDiv.attributes.setNamedItem;
                    // @ts-expect-error
                    itemDiv.dataset.pos = node.pos;
                    // @ts-expect-error
                    itemDiv.dataset.end = node.end;
                    // @ts-expect-error
                    itemDiv.dataset.depth = depth;
                    if (depth === 0)
                        itemDiv.classList.add("open");
                    const info = infoForNode(node);
                    const a = document.createElement("a");
                    a.classList.add("node-name");
                    a.textContent = info.name;
                    itemDiv.appendChild(a);
                    a.onclick = _ => a.parentElement.classList.toggle("open");
                    addEditorHoverToElement(a, { start: node.pos, end: node.end }, { type: "info" });
                    const properties = document.createElement("ul");
                    properties.className = "ast-tree";
                    itemDiv.appendChild(properties);
                    Object.keys(node).forEach(field => {
                        if (typeof field === "function")
                            return;
                        if (field === "parent" || field === "flowNode")
                            return;
                        const value = node[field];
                        if (typeof value === "object" && Array.isArray(value) && value[0] && "pos" in value[0] && "end" in value[0]) {
                            //  Is an array of Nodes
                            properties.appendChild(renderManyChildren(field, value, depth));
                        }
                        else if (typeof value === "object" && "pos" in value && "end" in value) {
                            // Is a single child property
                            properties.appendChild(renderSingleChild(field, value, depth));
                        }
                        else {
                            properties.appendChild(renderLiteralField(field, value, info));
                        }
                    });
                };
                renderItem(div, node, 0);
                container.append(div);
                return div;
            };
            const createTextInput = (config) => {
                const form = document.createElement("form");
                const textbox = document.createElement("input");
                textbox.id = config.id;
                textbox.placeholder = config.placeholder;
                textbox.autocomplete = "off";
                textbox.autocapitalize = "off";
                textbox.spellcheck = false;
                // @ts-ignore
                textbox.autocorrect = "off";
                const localStorageKey = "playground-input-" + config.id;
                if (config.value) {
                    textbox.value = config.value;
                }
                else if (config.keepValueAcrossReloads) {
                    const storedQuery = localStorage.getItem(localStorageKey);
                    if (storedQuery)
                        textbox.value = storedQuery;
                }
                if (config.isEnabled) {
                    const enabled = config.isEnabled(textbox);
                    textbox.classList.add(enabled ? "good" : "bad");
                }
                else {
                    textbox.classList.add("good");
                }
                const textUpdate = (e) => {
                    const href = e.target.value.trim();
                    if (config.keepValueAcrossReloads) {
                        localStorage.setItem(localStorageKey, href);
                    }
                    if (config.onChanged)
                        config.onChanged(e.target.value, textbox);
                };
                textbox.style.width = "90%";
                textbox.style.height = "2rem";
                textbox.addEventListener("input", textUpdate);
                // Suppress the enter key
                textbox.onkeydown = (evt) => {
                    if (evt.keyCode == 13) {
                        return false;
                    }
                };
                form.appendChild(textbox);
                container.appendChild(form);
                return form;
            };
            return {
                /** Clear the sidebar */
                clear,
                /** Present code in a pre > code  */
                code,
                /** Ideally only use this once, and maybe even prefer using subtitles everywhere */
                title: (title) => el(title, "h3", container),
                /** Used to denote sections, give info etc */
                subtitle: (subtitle) => el(subtitle, "h4", container),
                /** Used to show a paragraph */
                p: (subtitle) => el(subtitle, "p", container),
                /** When you can't do something, or have nothing to show */
                showEmptyScreen,
                /**
                 * Shows a list of hoverable, and selectable items (errors, highlights etc) which have code representation.
                 * The type is quite small, so it should be very feasible for you to massage other data to fit into this function
                 */
                listDiags,
                /** Shows a single option in local storage (adds an li to the container BTW) */
                localStorageOption,
                /** Uses localStorageOption to create a list of options */
                showOptionList,
                /** Shows a full-width text input */
                createTextInput,
                /** Renders an AST tree */
                createASTTree,
                /** Creates an input button */
                button,
            };
        };
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlRGVzaWduU3lzdGVtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGxheWdyb3VuZC9zcmMvZHMvY3JlYXRlRGVzaWduU3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7SUFpQkEsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFXLEVBQUUsV0FBbUIsRUFBRSxTQUFrQixFQUFFLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5QyxFQUFFLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQTtRQUNsQixTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pCLE9BQU8sRUFBRSxDQUFBO0lBQ1gsQ0FBQyxDQUFBO0lBRUQsc0NBQXNDO0lBQ3pCLFFBQUEsa0JBQWtCLEdBQUcsQ0FBQyxPQUFnQixFQUFFLEVBQUU7UUFDckQsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQTtRQUVyQixPQUFPLENBQUMsU0FBa0IsRUFBRSxFQUFFO1lBQzVCLE1BQU0sS0FBSyxHQUFHLEdBQUcsRUFBRTtnQkFDakIsT0FBTyxTQUFTLENBQUMsVUFBVSxFQUFFO29CQUMzQixTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtpQkFDNUM7WUFDSCxDQUFDLENBQUE7WUFDRCxJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUE7WUFDOUIsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFBO1lBRTFCLGlFQUFpRTtZQUNqRSxNQUFNLHVCQUF1QixHQUFHLENBQzlCLE9BQW9CLEVBQ3BCLEdBQW1DLEVBQ25DLE1BQWtDLEVBQ2xDLEVBQUU7Z0JBQ0YsT0FBTyxDQUFDLFlBQVksR0FBRyxHQUFHLEVBQUU7b0JBQzFCLElBQUksQ0FBQyxjQUFjLEVBQUU7d0JBQ25CLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTt3QkFDaEMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQzVDLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO3dCQUN4QyxXQUFXLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUU7NEJBQ3pEO2dDQUNFLEtBQUssRUFBRSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUM7Z0NBQzNGLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRTs2QkFDekQ7eUJBQ0YsQ0FBQyxDQUFBO3FCQUNIO2dCQUNILENBQUMsQ0FBQTtnQkFFRCxPQUFPLENBQUMsWUFBWSxHQUFHLEdBQUcsRUFBRTtvQkFDMUIsSUFBSSxDQUFDLGNBQWMsRUFBRTt3QkFDbkIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7cUJBQ2pEO2dCQUNILENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQTtZQUVELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxPQUEyQixFQUFFLEVBQUU7Z0JBQ3pELGlHQUFpRztnQkFDakcsMEJBQTBCO2dCQUMxQixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUE7Z0JBRWpELE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3ZDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQzdDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO2dCQUM1QyxLQUFLLENBQUMsU0FBUyxHQUFHLFNBQVMsT0FBTyxDQUFDLE9BQU8sVUFBVSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUUzRSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO2dCQUN4QixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUM3QyxLQUFLLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQTtnQkFDdkIsS0FBSyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUE7Z0JBRWQsS0FBSyxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBRXhGLEtBQUssQ0FBQyxRQUFRLEdBQUcsR0FBRyxFQUFFO29CQUNwQixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUU7d0JBQ2pCLElBQUksQ0FBQyxhQUFhOzRCQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFBOzs0QkFDaEQsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtxQkFDbEM7eUJBQU07d0JBQ0wsSUFBSSxhQUFhOzRCQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFBOzs0QkFDL0MsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtxQkFDbEM7b0JBRUQsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO3dCQUNwQixPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7cUJBQzlDO2dCQUNILENBQUMsQ0FBQTtnQkFFRCxLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUE7Z0JBRXhCLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3JCLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3JCLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3pCLE9BQU8sRUFBRSxDQUFBO1lBQ1gsQ0FBQyxDQUFBO1lBRUQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxRQUErRCxFQUFFLEVBQUU7Z0JBQ2pGLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQzVDLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFBO2dCQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUE7Z0JBQzNCLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRTtvQkFDcEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFBO2lCQUNoQztnQkFFRCxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMzQixPQUFPLElBQUksQ0FBQTtZQUNiLENBQUMsQ0FBQTtZQUVELE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7Z0JBQzVCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ25ELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBRWxELFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO2dCQUU1QixhQUFhLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUN0QyxTQUFTLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUVwQyxPQUFPLFdBQVcsQ0FBQTtZQUNwQixDQUFDLENBQUE7WUFFRCxNQUFNLGVBQWUsR0FBRyxDQUFDLE9BQWUsRUFBRSxFQUFFO2dCQUMxQyxLQUFLLEVBQUUsQ0FBQTtnQkFFUCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNyRCxlQUFlLENBQUMsRUFBRSxHQUFHLHlCQUF5QixDQUFBO2dCQUU5QyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNoRCxVQUFVLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQTtnQkFDaEMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtnQkFDaEQsZUFBZSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFFdkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDdEMsT0FBTyxlQUFlLENBQUE7WUFDeEIsQ0FBQyxDQUFBO1lBRUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxLQUFnRCxFQUFFLEtBQXFDLEVBQUUsRUFBRTtnQkFDNUcsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDNUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQTtnQkFFMUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFFOUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDbkIsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDdkMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7b0JBQzlCLFFBQVEsSUFBSSxDQUFDLFFBQVEsRUFBRTt3QkFDckIsS0FBSyxDQUFDOzRCQUNKLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBOzRCQUMzQixNQUFLO3dCQUNQLEtBQUssQ0FBQzs0QkFDSixFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTs0QkFDekIsTUFBSzt3QkFDUCxLQUFLLENBQUM7NEJBQ0osRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7NEJBQzlCLE1BQUs7d0JBQ1AsS0FBSyxDQUFDOzRCQUNKLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBOzRCQUMzQixNQUFLO3FCQUNSO29CQUVELElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO3dCQUM1QixFQUFFLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtxQkFDdEI7eUJBQU07d0JBQ0wsRUFBRSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7cUJBQ2pGO29CQUNELE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7b0JBRXZCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO3dCQUM3Qix1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtxQkFDckc7b0JBRUQsRUFBRSxDQUFDLE9BQU8sR0FBRyxHQUFHLEVBQUU7d0JBQ2hCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFOzRCQUM3QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTs0QkFDN0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBOzRCQUUzQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBOzRCQUN6RCxXQUFXLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUU7Z0NBQ3pEO29DQUNFLEtBQUssRUFBRSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUM7b0NBQzNGLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2lDQUNuRTs2QkFDRixDQUFDLENBQUE7NEJBRUYsY0FBYyxHQUFHLElBQUksQ0FBQTs0QkFDckIsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQ0FDZCxjQUFjLEdBQUcsS0FBSyxDQUFBO2dDQUN0QixPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTs0QkFDbEQsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO3lCQUNSO29CQUNILENBQUMsQ0FBQTtnQkFDSCxDQUFDLENBQUMsQ0FBQTtnQkFDRixPQUFPLE9BQU8sQ0FBQTtZQUNoQixDQUFDLENBQUE7WUFFRCxNQUFNLGNBQWMsR0FBRyxDQUFDLE9BQTZCLEVBQUUsS0FBd0IsRUFBRSxFQUFFO2dCQUNqRixNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN2QyxFQUFFLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxLQUFLLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUE7Z0JBRTlGLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7b0JBQ3ZCLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxNQUFNO3dCQUFFLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO29CQUVqRCxNQUFNLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDaEQsRUFBRSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQyxDQUFDLENBQUE7Z0JBRUYsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUMzQixDQUFDLENBQUE7WUFFRCxNQUFNLGFBQWEsR0FBRyxDQUFDLElBQVUsRUFBRSxFQUFFO2dCQUNuQyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUN6QyxHQUFHLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtnQkFFckIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFVLEVBQUUsRUFBRTtvQkFDakMsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBRXJDLE9BQU87d0JBQ0wsSUFBSTtxQkFDTCxDQUFBO2dCQUNILENBQUMsQ0FBQTtnQkFJRCxNQUFNLGtCQUFrQixHQUFHLENBQUMsR0FBVyxFQUFFLEtBQWEsRUFBRSxJQUFjLEVBQUUsRUFBRTtvQkFDeEUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDdkMsTUFBTSxVQUFVLEdBQUcsWUFBWSxPQUFPLEtBQUssRUFBRSxDQUFBO29CQUM3QyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7b0JBQ2YsSUFBSSxHQUFHLEtBQUssTUFBTSxFQUFFO3dCQUNsQixNQUFNLEdBQUcsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQTtxQkFDdEM7b0JBQ0QsRUFBRSxDQUFDLFNBQVMsR0FBRyxHQUFHLEdBQUcsa0JBQWtCLFVBQVUsS0FBSyxLQUFLLFVBQVUsTUFBTSxFQUFFLENBQUE7b0JBQzdFLE9BQU8sRUFBRSxDQUFBO2dCQUNYLENBQUMsQ0FBQTtnQkFFRCxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBVyxFQUFFLEtBQVcsRUFBRSxLQUFhLEVBQUUsRUFBRTtvQkFDcEUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDdkMsRUFBRSxDQUFDLFNBQVMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFBO29CQUV6QixVQUFVLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7b0JBQ2hDLE9BQU8sRUFBRSxDQUFBO2dCQUNYLENBQUMsQ0FBQTtnQkFFRCxNQUFNLGtCQUFrQixHQUFHLENBQUMsR0FBVyxFQUFFLEtBQWEsRUFBRSxLQUFhLEVBQUUsRUFBRTtvQkFDdkUsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDOUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7b0JBRXRDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ3ZDLEVBQUUsQ0FBQyxTQUFTLEdBQUcsR0FBRyxHQUFHLFVBQVUsQ0FBQTtvQkFDL0IsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFFeEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDbkIsVUFBVSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO29CQUN2QyxDQUFDLENBQUMsQ0FBQTtvQkFFRixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUMxQyxLQUFLLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQTtvQkFDdEIsUUFBUSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDM0IsT0FBTyxRQUFRLENBQUE7Z0JBQ2pCLENBQUMsQ0FBQTtnQkFFRCxNQUFNLFVBQVUsR0FBRyxDQUFDLGFBQXNCLEVBQUUsSUFBVSxFQUFFLEtBQWEsRUFBRSxFQUFFO29CQUN2RSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUM3QyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUNsQyxPQUFPLENBQUMsU0FBUyxHQUFHLGdCQUFnQixDQUFBO29CQUNwQyxPQUFPLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQTtvQkFDL0IsbUJBQW1CO29CQUNuQixPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO29CQUM5QixtQkFBbUI7b0JBQ25CLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7b0JBQzlCLG1CQUFtQjtvQkFDbkIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO29CQUU3QixJQUFJLEtBQUssS0FBSyxDQUFDO3dCQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUU5QyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBRTlCLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ3JDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO29CQUM1QixDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7b0JBQ3pCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3RCLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQzFELHVCQUF1QixDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtvQkFFaEYsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDL0MsVUFBVSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUE7b0JBQ2pDLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBRS9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO3dCQUNoQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFVBQVU7NEJBQUUsT0FBTTt3QkFDdkMsSUFBSSxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssS0FBSyxVQUFVOzRCQUFFLE9BQU07d0JBRXRELE1BQU0sS0FBSyxHQUFJLElBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFDbEMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFOzRCQUMzRyx3QkFBd0I7NEJBQ3hCLFVBQVUsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO3lCQUNoRTs2QkFBTSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLLEVBQUU7NEJBQ3hFLDZCQUE2Qjs0QkFDN0IsVUFBVSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7eUJBQy9EOzZCQUFNOzRCQUNMLFVBQVUsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO3lCQUMvRDtvQkFDSCxDQUFDLENBQUMsQ0FBQTtnQkFDSixDQUFDLENBQUE7Z0JBRUQsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hCLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3JCLE9BQU8sR0FBRyxDQUFBO1lBQ1osQ0FBQyxDQUFBO1lBY0QsTUFBTSxlQUFlLEdBQUcsQ0FBQyxNQUF1QixFQUFFLEVBQUU7Z0JBQ2xELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBRTNDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQy9DLE9BQU8sQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQTtnQkFDdEIsT0FBTyxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFBO2dCQUN4QyxPQUFPLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQTtnQkFDNUIsT0FBTyxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUE7Z0JBQzlCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBO2dCQUMxQixhQUFhO2dCQUNiLE9BQU8sQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO2dCQUUzQixNQUFNLGVBQWUsR0FBRyxtQkFBbUIsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFBO2dCQUV2RCxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7b0JBQ2hCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQTtpQkFDN0I7cUJBQU0sSUFBSSxNQUFNLENBQUMsc0JBQXNCLEVBQUU7b0JBQ3hDLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUE7b0JBQ3pELElBQUksV0FBVzt3QkFBRSxPQUFPLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQTtpQkFDN0M7Z0JBRUQsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFO29CQUNwQixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUN6QyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7aUJBQ2hEO3FCQUFNO29CQUNMLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2lCQUM5QjtnQkFFRCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQU0sRUFBRSxFQUFFO29CQUM1QixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtvQkFDbEMsSUFBSSxNQUFNLENBQUMsc0JBQXNCLEVBQUU7d0JBQ2pDLFlBQVksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFBO3FCQUM1QztvQkFDRCxJQUFJLE1BQU0sQ0FBQyxTQUFTO3dCQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQ2pFLENBQUMsQ0FBQTtnQkFFRCxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7Z0JBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtnQkFDN0IsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFFN0MseUJBQXlCO2dCQUN6QixPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsR0FBa0IsRUFBRSxFQUFFO29CQUN6QyxJQUFJLEdBQUcsQ0FBQyxPQUFPLElBQUksRUFBRSxFQUFFO3dCQUNyQixPQUFPLEtBQUssQ0FBQTtxQkFDYjtnQkFDSCxDQUFDLENBQUE7Z0JBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDekIsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDM0IsT0FBTyxJQUFJLENBQUE7WUFDYixDQUFDLENBQUE7WUFFRCxPQUFPO2dCQUNMLHdCQUF3QjtnQkFDeEIsS0FBSztnQkFDTCxvQ0FBb0M7Z0JBQ3BDLElBQUk7Z0JBQ0osbUZBQW1GO2dCQUNuRixLQUFLLEVBQUUsQ0FBQyxLQUFhLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQztnQkFDcEQsNkNBQTZDO2dCQUM3QyxRQUFRLEVBQUUsQ0FBQyxRQUFnQixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUM7Z0JBQzdELCtCQUErQjtnQkFDL0IsQ0FBQyxFQUFFLENBQUMsUUFBZ0IsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxDQUFDO2dCQUNyRCwyREFBMkQ7Z0JBQzNELGVBQWU7Z0JBQ2Y7OzttQkFHRztnQkFDSCxTQUFTO2dCQUNULCtFQUErRTtnQkFDL0Usa0JBQWtCO2dCQUNsQiwwREFBMEQ7Z0JBQzFELGNBQWM7Z0JBQ2Qsb0NBQW9DO2dCQUNwQyxlQUFlO2dCQUNmLDBCQUEwQjtnQkFDMUIsYUFBYTtnQkFDYiw4QkFBOEI7Z0JBQzlCLE1BQU07YUFDUCxDQUFBO1FBQ0gsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBTYW5kYm94IH0gZnJvbSBcInR5cGVzY3JpcHRsYW5nLW9yZy9zdGF0aWMvanMvc2FuZGJveFwiXG5pbXBvcnQgdHlwZSB7IERpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb24sIE5vZGUgfSBmcm9tIFwidHlwZXNjcmlwdFwiXG5cbmV4cG9ydCB0eXBlIExvY2FsU3RvcmFnZU9wdGlvbiA9IHtcbiAgYmx1cmI6IHN0cmluZ1xuICBmbGFnOiBzdHJpbmdcbiAgZGlzcGxheTogc3RyaW5nXG5cbiAgZW1wdHlJbXBsaWVzRW5hYmxlZD86IHRydWVcbiAgb25lbGluZT86IHRydWVcbiAgb25jaGFuZ2U/OiAobmV3VmFsdWU6IGJvb2xlYW4pID0+IHZvaWRcbn1cblxuZXhwb3J0IHR5cGUgT3B0aW9uc0xpc3RDb25maWcgPSB7XG4gIHN0eWxlOiBcInNlcGFyYXRlZFwiIHwgXCJyb3dzXCJcbn1cblxuY29uc3QgZWwgPSAoc3RyOiBzdHJpbmcsIGVsZW1lbnRUeXBlOiBzdHJpbmcsIGNvbnRhaW5lcjogRWxlbWVudCkgPT4ge1xuICBjb25zdCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWxlbWVudFR5cGUpXG4gIGVsLmlubmVySFRNTCA9IHN0clxuICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZWwpXG4gIHJldHVybiBlbFxufVxuXG4vLyBUaGUgUGxheWdyb3VuZCBQbHVnaW4gZGVzaWduIHN5c3RlbVxuZXhwb3J0IGNvbnN0IGNyZWF0ZURlc2lnblN5c3RlbSA9IChzYW5kYm94OiBTYW5kYm94KSA9PiB7XG4gIGNvbnN0IHRzID0gc2FuZGJveC50c1xuXG4gIHJldHVybiAoY29udGFpbmVyOiBFbGVtZW50KSA9PiB7XG4gICAgY29uc3QgY2xlYXIgPSAoKSA9PiB7XG4gICAgICB3aGlsZSAoY29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkKGNvbnRhaW5lci5maXJzdENoaWxkKVxuICAgICAgfVxuICAgIH1cbiAgICBsZXQgZGVjb3JhdGlvbnM6IHN0cmluZ1tdID0gW11cbiAgICBsZXQgZGVjb3JhdGlvbkxvY2sgPSBmYWxzZVxuXG4gICAgLyoqIExldHMgYSBIVE1MIEVsZW1lbnQgaG92ZXIgdG8gaGlnaGxpZ2h0IGNvZGUgaW4gdGhlIGVkaXRvciAgKi9cbiAgICBjb25zdCBhZGRFZGl0b3JIb3ZlclRvRWxlbWVudCA9IChcbiAgICAgIGVsZW1lbnQ6IEhUTUxFbGVtZW50LFxuICAgICAgcG9zOiB7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyIH0sXG4gICAgICBjb25maWc6IHsgdHlwZTogXCJlcnJvclwiIHwgXCJpbmZvXCIgfVxuICAgICkgPT4ge1xuICAgICAgZWxlbWVudC5vbm1vdXNlZW50ZXIgPSAoKSA9PiB7XG4gICAgICAgIGlmICghZGVjb3JhdGlvbkxvY2spIHtcbiAgICAgICAgICBjb25zdCBtb2RlbCA9IHNhbmRib3guZ2V0TW9kZWwoKVxuICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbW9kZWwuZ2V0UG9zaXRpb25BdChwb3Muc3RhcnQpXG4gICAgICAgICAgY29uc3QgZW5kID0gbW9kZWwuZ2V0UG9zaXRpb25BdChwb3MuZW5kKVxuICAgICAgICAgIGRlY29yYXRpb25zID0gc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICByYW5nZTogbmV3IHNhbmRib3gubW9uYWNvLlJhbmdlKHN0YXJ0LmxpbmVOdW1iZXIsIHN0YXJ0LmNvbHVtbiwgZW5kLmxpbmVOdW1iZXIsIGVuZC5jb2x1bW4pLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7IGlubGluZUNsYXNzTmFtZTogXCJoaWdobGlnaHQtXCIgKyBjb25maWcudHlwZSB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGVsZW1lbnQub25tb3VzZWxlYXZlID0gKCkgPT4ge1xuICAgICAgICBpZiAoIWRlY29yYXRpb25Mb2NrKSB7XG4gICAgICAgICAgc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW10pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBsb2NhbFN0b3JhZ2VPcHRpb24gPSAoc2V0dGluZzogTG9jYWxTdG9yYWdlT3B0aW9uKSA9PiB7XG4gICAgICAvLyBUaGluayBhYm91dCB0aGlzIGFzIGJlaW5nIHNvbWV0aGluZyB3aGljaCB5b3Ugd2FudCBlbmFibGVkIGJ5IGRlZmF1bHQgYW5kIGNhbiBzdXBwcmVzcyB3aGV0aGVyXG4gICAgICAvLyBpdCBzaG91bGQgZG8gc29tZXRoaW5nLlxuICAgICAgY29uc3QgaW52ZXJ0ZWRMb2dpYyA9IHNldHRpbmcuZW1wdHlJbXBsaWVzRW5hYmxlZFxuXG4gICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKVxuICAgICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIilcbiAgICAgIGNvbnN0IHNwbGl0ID0gc2V0dGluZy5vbmVsaW5lID8gXCJcIiA6IFwiPGJyLz5cIlxuICAgICAgbGFiZWwuaW5uZXJIVE1MID0gYDxzcGFuPiR7c2V0dGluZy5kaXNwbGF5fTwvc3Bhbj4ke3NwbGl0fSR7c2V0dGluZy5ibHVyYn1gXG5cbiAgICAgIGNvbnN0IGtleSA9IHNldHRpbmcuZmxhZ1xuICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIilcbiAgICAgIGlucHV0LnR5cGUgPSBcImNoZWNrYm94XCJcbiAgICAgIGlucHV0LmlkID0ga2V5XG5cbiAgICAgIGlucHV0LmNoZWNrZWQgPSBpbnZlcnRlZExvZ2ljID8gIWxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSkgOiAhIWxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSlcblxuICAgICAgaW5wdXQub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgIGlmIChpbnB1dC5jaGVja2VkKSB7XG4gICAgICAgICAgaWYgKCFpbnZlcnRlZExvZ2ljKSBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksIFwidHJ1ZVwiKVxuICAgICAgICAgIGVsc2UgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChpbnZlcnRlZExvZ2ljKSBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksIFwidHJ1ZVwiKVxuICAgICAgICAgIGVsc2UgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNldHRpbmcub25jaGFuZ2UpIHtcbiAgICAgICAgICBzZXR0aW5nLm9uY2hhbmdlKCEhbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsYWJlbC5odG1sRm9yID0gaW5wdXQuaWRcblxuICAgICAgbGkuYXBwZW5kQ2hpbGQoaW5wdXQpXG4gICAgICBsaS5hcHBlbmRDaGlsZChsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsaSlcbiAgICAgIHJldHVybiBsaVxuICAgIH1cblxuICAgIGNvbnN0IGJ1dHRvbiA9IChzZXR0aW5nczogeyBsYWJlbDogc3RyaW5nOyBvbmNsaWNrPzogKGV2OiBNb3VzZUV2ZW50KSA9PiB2b2lkIH0pID0+IHtcbiAgICAgIGNvbnN0IGpvaW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIilcbiAgICAgIGpvaW4udHlwZSA9IFwiYnV0dG9uXCJcbiAgICAgIGpvaW4udmFsdWUgPSBzZXR0aW5ncy5sYWJlbFxuICAgICAgaWYgKHNldHRpbmdzLm9uY2xpY2spIHtcbiAgICAgICAgam9pbi5vbmNsaWNrID0gc2V0dGluZ3Mub25jbGlja1xuICAgICAgfVxuXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoam9pbilcbiAgICAgIHJldHVybiBqb2luXG4gICAgfVxuXG4gICAgY29uc3QgY29kZSA9IChjb2RlOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGNyZWF0ZUNvZGVQcmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicHJlXCIpXG4gICAgICBjb25zdCBjb2RlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjb2RlXCIpXG5cbiAgICAgIGNvZGVFbGVtZW50LmlubmVySFRNTCA9IGNvZGVcblxuICAgICAgY3JlYXRlQ29kZVByZS5hcHBlbmRDaGlsZChjb2RlRWxlbWVudClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChjcmVhdGVDb2RlUHJlKVxuXG4gICAgICByZXR1cm4gY29kZUVsZW1lbnRcbiAgICB9XG5cbiAgICBjb25zdCBzaG93RW1wdHlTY3JlZW4gPSAobWVzc2FnZTogc3RyaW5nKSA9PiB7XG4gICAgICBjbGVhcigpXG5cbiAgICAgIGNvbnN0IG5vRXJyb3JzTWVzc2FnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgIG5vRXJyb3JzTWVzc2FnZS5pZCA9IFwiZW1wdHktbWVzc2FnZS1jb250YWluZXJcIlxuXG4gICAgICBjb25zdCBtZXNzYWdlRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgbWVzc2FnZURpdi50ZXh0Q29udGVudCA9IG1lc3NhZ2VcbiAgICAgIG1lc3NhZ2VEaXYuY2xhc3NMaXN0LmFkZChcImVtcHR5LXBsdWdpbi1tZXNzYWdlXCIpXG4gICAgICBub0Vycm9yc01lc3NhZ2UuYXBwZW5kQ2hpbGQobWVzc2FnZURpdilcblxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG5vRXJyb3JzTWVzc2FnZSlcbiAgICAgIHJldHVybiBub0Vycm9yc01lc3NhZ2VcbiAgICB9XG5cbiAgICBjb25zdCBsaXN0RGlhZ3MgPSAobW9kZWw6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuZWRpdG9yLklUZXh0TW9kZWwsIGRpYWdzOiBEaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW10pID0+IHtcbiAgICAgIGNvbnN0IGVycm9yVUwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidWxcIilcbiAgICAgIGVycm9yVUwuY2xhc3NOYW1lID0gXCJjb21waWxlci1kaWFnbm9zdGljc1wiXG5cbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChlcnJvclVMKVxuXG4gICAgICBkaWFncy5mb3JFYWNoKGRpYWcgPT4ge1xuICAgICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKVxuICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKFwiZGlhZ25vc3RpY1wiKVxuICAgICAgICBzd2l0Y2ggKGRpYWcuY2F0ZWdvcnkpIHtcbiAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKFwid2FybmluZ1wiKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBsaS5jbGFzc0xpc3QuYWRkKFwiZXJyb3JcIilcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgbGkuY2xhc3NMaXN0LmFkZChcInN1Z2dlc3Rpb25cIilcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgbGkuY2xhc3NMaXN0LmFkZChcIm1lc3NhZ2VcIilcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGRpYWcgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICBsaS50ZXh0Q29udGVudCA9IGRpYWdcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaS50ZXh0Q29udGVudCA9IHNhbmRib3gudHMuZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlVGV4dChkaWFnLm1lc3NhZ2VUZXh0LCBcIlxcblwiKVxuICAgICAgICB9XG4gICAgICAgIGVycm9yVUwuYXBwZW5kQ2hpbGQobGkpXG5cbiAgICAgICAgaWYgKGRpYWcuc3RhcnQgJiYgZGlhZy5sZW5ndGgpIHtcbiAgICAgICAgICBhZGRFZGl0b3JIb3ZlclRvRWxlbWVudChsaSwgeyBzdGFydDogZGlhZy5zdGFydCwgZW5kOiBkaWFnLnN0YXJ0ICsgZGlhZy5sZW5ndGggfSwgeyB0eXBlOiBcImVycm9yXCIgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGxpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgaWYgKGRpYWcuc3RhcnQgJiYgZGlhZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbW9kZWwuZ2V0UG9zaXRpb25BdChkaWFnLnN0YXJ0KVxuICAgICAgICAgICAgc2FuZGJveC5lZGl0b3IucmV2ZWFsTGluZShzdGFydC5saW5lTnVtYmVyKVxuXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBtb2RlbC5nZXRQb3NpdGlvbkF0KGRpYWcuc3RhcnQgKyBkaWFnLmxlbmd0aClcbiAgICAgICAgICAgIGRlY29yYXRpb25zID0gc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmFuZ2U6IG5ldyBzYW5kYm94Lm1vbmFjby5SYW5nZShzdGFydC5saW5lTnVtYmVyLCBzdGFydC5jb2x1bW4sIGVuZC5saW5lTnVtYmVyLCBlbmQuY29sdW1uKSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiB7IGlubGluZUNsYXNzTmFtZTogXCJlcnJvci1oaWdobGlnaHRcIiwgaXNXaG9sZUxpbmU6IHRydWUgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0pXG5cbiAgICAgICAgICAgIGRlY29yYXRpb25Mb2NrID0gdHJ1ZVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGRlY29yYXRpb25Mb2NrID0gZmFsc2VcbiAgICAgICAgICAgICAgc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW10pXG4gICAgICAgICAgICB9LCAzMDApXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgcmV0dXJuIGVycm9yVUxcbiAgICB9XG5cbiAgICBjb25zdCBzaG93T3B0aW9uTGlzdCA9IChvcHRpb25zOiBMb2NhbFN0b3JhZ2VPcHRpb25bXSwgc3R5bGU6IE9wdGlvbnNMaXN0Q29uZmlnKSA9PiB7XG4gICAgICBjb25zdCBvbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvbFwiKVxuICAgICAgb2wuY2xhc3NOYW1lID0gc3R5bGUuc3R5bGUgPT09IFwic2VwYXJhdGVkXCIgPyBcInBsYXlncm91bmQtb3B0aW9uc1wiIDogXCJwbGF5Z3JvdW5kLW9wdGlvbnMgdGlnaHRcIlxuXG4gICAgICBvcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlID09PSBcInJvd3NcIikgb3B0aW9uLm9uZWxpbmUgPSB0cnVlXG5cbiAgICAgICAgY29uc3Qgc2V0dGluZ0J1dHRvbiA9IGxvY2FsU3RvcmFnZU9wdGlvbihvcHRpb24pXG4gICAgICAgIG9sLmFwcGVuZENoaWxkKHNldHRpbmdCdXR0b24pXG4gICAgICB9KVxuXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQob2wpXG4gICAgfVxuXG4gICAgY29uc3QgY3JlYXRlQVNUVHJlZSA9IChub2RlOiBOb2RlKSA9PiB7XG4gICAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICBkaXYuY2xhc3NOYW1lID0gXCJhc3RcIlxuXG4gICAgICBjb25zdCBpbmZvRm9yTm9kZSA9IChub2RlOiBOb2RlKSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSB0cy5TeW50YXhLaW5kW25vZGUua2luZF1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG5hbWUsXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdHlwZSBOb2RlSW5mbyA9IFJldHVyblR5cGU8dHlwZW9mIGluZm9Gb3JOb2RlPlxuXG4gICAgICBjb25zdCByZW5kZXJMaXRlcmFsRmllbGQgPSAoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIGluZm86IE5vZGVJbmZvKSA9PiB7XG4gICAgICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpXG4gICAgICAgIGNvbnN0IHR5cGVvZlNwYW4gPSBgYXN0LW5vZGUtJHt0eXBlb2YgdmFsdWV9YFxuICAgICAgICBsZXQgc3VmZml4ID0gXCJcIlxuICAgICAgICBpZiAoa2V5ID09PSBcImtpbmRcIikge1xuICAgICAgICAgIHN1ZmZpeCA9IGAgKFN5bnRheEtpbmQuJHtpbmZvLm5hbWV9KWBcbiAgICAgICAgfVxuICAgICAgICBsaS5pbm5lckhUTUwgPSBgJHtrZXl9OiA8c3BhbiBjbGFzcz0nJHt0eXBlb2ZTcGFufSc+JHt2YWx1ZX08L3NwYW4+JHtzdWZmaXh9YFxuICAgICAgICByZXR1cm4gbGlcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVuZGVyU2luZ2xlQ2hpbGQgPSAoa2V5OiBzdHJpbmcsIHZhbHVlOiBOb2RlLCBkZXB0aDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpXG4gICAgICAgIGxpLmlubmVySFRNTCA9IGAke2tleX06IGBcblxuICAgICAgICByZW5kZXJJdGVtKGxpLCB2YWx1ZSwgZGVwdGggKyAxKVxuICAgICAgICByZXR1cm4gbGlcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVuZGVyTWFueUNoaWxkcmVuID0gKGtleTogc3RyaW5nLCBub2RlczogTm9kZVtdLCBkZXB0aDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IGNoaWxkZXJzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBjaGlsZGVycy5jbGFzc0xpc3QuYWRkKFwiYXN0LWNoaWxkcmVuXCIpXG5cbiAgICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICAgICAgbGkuaW5uZXJIVE1MID0gYCR7a2V5fTogWzxici8+YFxuICAgICAgICBjaGlsZGVycy5hcHBlbmRDaGlsZChsaSlcblxuICAgICAgICBub2Rlcy5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICAgIHJlbmRlckl0ZW0oY2hpbGRlcnMsIG5vZGUsIGRlcHRoICsgMSlcbiAgICAgICAgfSlcblxuICAgICAgICBjb25zdCBsaUVuZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKVxuICAgICAgICBsaUVuZC5pbm5lckhUTUwgKz0gXCJdXCJcbiAgICAgICAgY2hpbGRlcnMuYXBwZW5kQ2hpbGQobGlFbmQpXG4gICAgICAgIHJldHVybiBjaGlsZGVyc1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZW5kZXJJdGVtID0gKHBhcmVudEVsZW1lbnQ6IEVsZW1lbnQsIG5vZGU6IE5vZGUsIGRlcHRoOiBudW1iZXIpID0+IHtcbiAgICAgICAgY29uc3QgaXRlbURpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgcGFyZW50RWxlbWVudC5hcHBlbmRDaGlsZChpdGVtRGl2KVxuICAgICAgICBpdGVtRGl2LmNsYXNzTmFtZSA9IFwiYXN0LXRyZWUtc3RhcnRcIlxuICAgICAgICBpdGVtRGl2LmF0dHJpYnV0ZXMuc2V0TmFtZWRJdGVtXG4gICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgICAgICAgaXRlbURpdi5kYXRhc2V0LnBvcyA9IG5vZGUucG9zXG4gICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgICAgICAgaXRlbURpdi5kYXRhc2V0LmVuZCA9IG5vZGUuZW5kXG4gICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgICAgICAgaXRlbURpdi5kYXRhc2V0LmRlcHRoID0gZGVwdGhcblxuICAgICAgICBpZiAoZGVwdGggPT09IDApIGl0ZW1EaXYuY2xhc3NMaXN0LmFkZChcIm9wZW5cIilcblxuICAgICAgICBjb25zdCBpbmZvID0gaW5mb0Zvck5vZGUobm9kZSlcblxuICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIilcbiAgICAgICAgYS5jbGFzc0xpc3QuYWRkKFwibm9kZS1uYW1lXCIpXG4gICAgICAgIGEudGV4dENvbnRlbnQgPSBpbmZvLm5hbWVcbiAgICAgICAgaXRlbURpdi5hcHBlbmRDaGlsZChhKVxuICAgICAgICBhLm9uY2xpY2sgPSBfID0+IGEucGFyZW50RWxlbWVudCEuY2xhc3NMaXN0LnRvZ2dsZShcIm9wZW5cIilcbiAgICAgICAgYWRkRWRpdG9ySG92ZXJUb0VsZW1lbnQoYSwgeyBzdGFydDogbm9kZS5wb3MsIGVuZDogbm9kZS5lbmQgfSwgeyB0eXBlOiBcImluZm9cIiB9KVxuXG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidWxcIilcbiAgICAgICAgcHJvcGVydGllcy5jbGFzc05hbWUgPSBcImFzdC10cmVlXCJcbiAgICAgICAgaXRlbURpdi5hcHBlbmRDaGlsZChwcm9wZXJ0aWVzKVxuXG4gICAgICAgIE9iamVjdC5rZXlzKG5vZGUpLmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2YgZmllbGQgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuXG4gICAgICAgICAgaWYgKGZpZWxkID09PSBcInBhcmVudFwiIHx8IGZpZWxkID09PSBcImZsb3dOb2RlXCIpIHJldHVyblxuXG4gICAgICAgICAgY29uc3QgdmFsdWUgPSAobm9kZSBhcyBhbnkpW2ZpZWxkXVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWVbMF0gJiYgXCJwb3NcIiBpbiB2YWx1ZVswXSAmJiBcImVuZFwiIGluIHZhbHVlWzBdKSB7XG4gICAgICAgICAgICAvLyAgSXMgYW4gYXJyYXkgb2YgTm9kZXNcbiAgICAgICAgICAgIHByb3BlcnRpZXMuYXBwZW5kQ2hpbGQocmVuZGVyTWFueUNoaWxkcmVuKGZpZWxkLCB2YWx1ZSwgZGVwdGgpKVxuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIFwicG9zXCIgaW4gdmFsdWUgJiYgXCJlbmRcIiBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gSXMgYSBzaW5nbGUgY2hpbGQgcHJvcGVydHlcbiAgICAgICAgICAgIHByb3BlcnRpZXMuYXBwZW5kQ2hpbGQocmVuZGVyU2luZ2xlQ2hpbGQoZmllbGQsIHZhbHVlLCBkZXB0aCkpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuYXBwZW5kQ2hpbGQocmVuZGVyTGl0ZXJhbEZpZWxkKGZpZWxkLCB2YWx1ZSwgaW5mbykpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICByZW5kZXJJdGVtKGRpdiwgbm9kZSwgMClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmQoZGl2KVxuICAgICAgcmV0dXJuIGRpdlxuICAgIH1cblxuICAgIHR5cGUgVGV4dElucHV0Q29uZmlnID0ge1xuICAgICAgaWQ6IHN0cmluZ1xuICAgICAgcGxhY2Vob2xkZXI6IHN0cmluZ1xuXG4gICAgICBvbkNoYW5nZWQ/OiAodGV4dDogc3RyaW5nLCBpbnB1dDogSFRNTElucHV0RWxlbWVudCkgPT4gdm9pZFxuICAgICAgb25FbnRlcjogKHRleHQ6IHN0cmluZywgaW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQpID0+IHZvaWRcblxuICAgICAgdmFsdWU/OiBzdHJpbmdcbiAgICAgIGtlZXBWYWx1ZUFjcm9zc1JlbG9hZHM/OiB0cnVlXG4gICAgICBpc0VuYWJsZWQ/OiAoaW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQpID0+IGJvb2xlYW5cbiAgICB9XG5cbiAgICBjb25zdCBjcmVhdGVUZXh0SW5wdXQgPSAoY29uZmlnOiBUZXh0SW5wdXRDb25maWcpID0+IHtcbiAgICAgIGNvbnN0IGZvcm0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZm9ybVwiKVxuXG4gICAgICBjb25zdCB0ZXh0Ym94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpXG4gICAgICB0ZXh0Ym94LmlkID0gY29uZmlnLmlkXG4gICAgICB0ZXh0Ym94LnBsYWNlaG9sZGVyID0gY29uZmlnLnBsYWNlaG9sZGVyXG4gICAgICB0ZXh0Ym94LmF1dG9jb21wbGV0ZSA9IFwib2ZmXCJcbiAgICAgIHRleHRib3guYXV0b2NhcGl0YWxpemUgPSBcIm9mZlwiXG4gICAgICB0ZXh0Ym94LnNwZWxsY2hlY2sgPSBmYWxzZVxuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgdGV4dGJveC5hdXRvY29ycmVjdCA9IFwib2ZmXCJcblxuICAgICAgY29uc3QgbG9jYWxTdG9yYWdlS2V5ID0gXCJwbGF5Z3JvdW5kLWlucHV0LVwiICsgY29uZmlnLmlkXG5cbiAgICAgIGlmIChjb25maWcudmFsdWUpIHtcbiAgICAgICAgdGV4dGJveC52YWx1ZSA9IGNvbmZpZy52YWx1ZVxuICAgICAgfSBlbHNlIGlmIChjb25maWcua2VlcFZhbHVlQWNyb3NzUmVsb2Fkcykge1xuICAgICAgICBjb25zdCBzdG9yZWRRdWVyeSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGxvY2FsU3RvcmFnZUtleSlcbiAgICAgICAgaWYgKHN0b3JlZFF1ZXJ5KSB0ZXh0Ym94LnZhbHVlID0gc3RvcmVkUXVlcnlcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5pc0VuYWJsZWQpIHtcbiAgICAgICAgY29uc3QgZW5hYmxlZCA9IGNvbmZpZy5pc0VuYWJsZWQodGV4dGJveClcbiAgICAgICAgdGV4dGJveC5jbGFzc0xpc3QuYWRkKGVuYWJsZWQgPyBcImdvb2RcIiA6IFwiYmFkXCIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZXh0Ym94LmNsYXNzTGlzdC5hZGQoXCJnb29kXCIpXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRleHRVcGRhdGUgPSAoZTogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IGhyZWYgPSBlLnRhcmdldC52YWx1ZS50cmltKClcbiAgICAgICAgaWYgKGNvbmZpZy5rZWVwVmFsdWVBY3Jvc3NSZWxvYWRzKSB7XG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0obG9jYWxTdG9yYWdlS2V5LCBocmVmKVxuICAgICAgICB9XG4gICAgICAgIGlmIChjb25maWcub25DaGFuZ2VkKSBjb25maWcub25DaGFuZ2VkKGUudGFyZ2V0LnZhbHVlLCB0ZXh0Ym94KVxuICAgICAgfVxuXG4gICAgICB0ZXh0Ym94LnN0eWxlLndpZHRoID0gXCI5MCVcIlxuICAgICAgdGV4dGJveC5zdHlsZS5oZWlnaHQgPSBcIjJyZW1cIlxuICAgICAgdGV4dGJveC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgdGV4dFVwZGF0ZSlcblxuICAgICAgLy8gU3VwcHJlc3MgdGhlIGVudGVyIGtleVxuICAgICAgdGV4dGJveC5vbmtleWRvd24gPSAoZXZ0OiBLZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChldnQua2V5Q29kZSA9PSAxMykge1xuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvcm0uYXBwZW5kQ2hpbGQodGV4dGJveClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChmb3JtKVxuICAgICAgcmV0dXJuIGZvcm1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgLyoqIENsZWFyIHRoZSBzaWRlYmFyICovXG4gICAgICBjbGVhcixcbiAgICAgIC8qKiBQcmVzZW50IGNvZGUgaW4gYSBwcmUgPiBjb2RlICAqL1xuICAgICAgY29kZSxcbiAgICAgIC8qKiBJZGVhbGx5IG9ubHkgdXNlIHRoaXMgb25jZSwgYW5kIG1heWJlIGV2ZW4gcHJlZmVyIHVzaW5nIHN1YnRpdGxlcyBldmVyeXdoZXJlICovXG4gICAgICB0aXRsZTogKHRpdGxlOiBzdHJpbmcpID0+IGVsKHRpdGxlLCBcImgzXCIsIGNvbnRhaW5lciksXG4gICAgICAvKiogVXNlZCB0byBkZW5vdGUgc2VjdGlvbnMsIGdpdmUgaW5mbyBldGMgKi9cbiAgICAgIHN1YnRpdGxlOiAoc3VidGl0bGU6IHN0cmluZykgPT4gZWwoc3VidGl0bGUsIFwiaDRcIiwgY29udGFpbmVyKSxcbiAgICAgIC8qKiBVc2VkIHRvIHNob3cgYSBwYXJhZ3JhcGggKi9cbiAgICAgIHA6IChzdWJ0aXRsZTogc3RyaW5nKSA9PiBlbChzdWJ0aXRsZSwgXCJwXCIsIGNvbnRhaW5lciksXG4gICAgICAvKiogV2hlbiB5b3UgY2FuJ3QgZG8gc29tZXRoaW5nLCBvciBoYXZlIG5vdGhpbmcgdG8gc2hvdyAqL1xuICAgICAgc2hvd0VtcHR5U2NyZWVuLFxuICAgICAgLyoqXG4gICAgICAgKiBTaG93cyBhIGxpc3Qgb2YgaG92ZXJhYmxlLCBhbmQgc2VsZWN0YWJsZSBpdGVtcyAoZXJyb3JzLCBoaWdobGlnaHRzIGV0Yykgd2hpY2ggaGF2ZSBjb2RlIHJlcHJlc2VudGF0aW9uLlxuICAgICAgICogVGhlIHR5cGUgaXMgcXVpdGUgc21hbGwsIHNvIGl0IHNob3VsZCBiZSB2ZXJ5IGZlYXNpYmxlIGZvciB5b3UgdG8gbWFzc2FnZSBvdGhlciBkYXRhIHRvIGZpdCBpbnRvIHRoaXMgZnVuY3Rpb25cbiAgICAgICAqL1xuICAgICAgbGlzdERpYWdzLFxuICAgICAgLyoqIFNob3dzIGEgc2luZ2xlIG9wdGlvbiBpbiBsb2NhbCBzdG9yYWdlIChhZGRzIGFuIGxpIHRvIHRoZSBjb250YWluZXIgQlRXKSAqL1xuICAgICAgbG9jYWxTdG9yYWdlT3B0aW9uLFxuICAgICAgLyoqIFVzZXMgbG9jYWxTdG9yYWdlT3B0aW9uIHRvIGNyZWF0ZSBhIGxpc3Qgb2Ygb3B0aW9ucyAqL1xuICAgICAgc2hvd09wdGlvbkxpc3QsXG4gICAgICAvKiogU2hvd3MgYSBmdWxsLXdpZHRoIHRleHQgaW5wdXQgKi9cbiAgICAgIGNyZWF0ZVRleHRJbnB1dCxcbiAgICAgIC8qKiBSZW5kZXJzIGFuIEFTVCB0cmVlICovXG4gICAgICBjcmVhdGVBU1RUcmVlLFxuICAgICAgLyoqIENyZWF0ZXMgYW4gaW5wdXQgYnV0dG9uICovXG4gICAgICBidXR0b24sXG4gICAgfVxuICB9XG59XG4iXX0=