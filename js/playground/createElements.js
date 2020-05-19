define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.activatePlugin = exports.createTabForPlugin = exports.createPluginContainer = exports.createTabBar = exports.setupSidebarToggle = exports.createSidebar = exports.sidebarHidden = exports.createDragBar = void 0;
    exports.createDragBar = () => {
        const sidebar = document.createElement("div");
        sidebar.className = "playground-dragbar";
        let left, right;
        const drag = (e) => {
            if (left && right) {
                // Get how far right the mouse is from the right
                const rightX = right.getBoundingClientRect().right;
                const offset = rightX - e.pageX;
                const screenClampLeft = window.innerWidth - 320;
                const clampedOffset = Math.min(Math.max(offset, 280), screenClampLeft);
                // Set the widths
                left.style.width = `calc(100% - ${clampedOffset}px)`;
                right.style.width = `${clampedOffset}px`;
                right.style.flexBasis = `${clampedOffset}px`;
                right.style.maxWidth = `${clampedOffset}px`;
                // Save the x coordinate of the
                if (window.localStorage) {
                    window.localStorage.setItem("dragbar-x", "" + clampedOffset);
                    window.localStorage.setItem("dragbar-window-width", "" + window.innerWidth);
                }
                // @ts-ignore - I know what I'm doing
                window.sandbox.editor.layout();
                // Don't allow selection
                e.stopPropagation();
                e.cancelBubble = true;
            }
        };
        sidebar.addEventListener("mousedown", e => {
            var _a;
            left = document.getElementById("editor-container");
            right = (_a = sidebar.parentElement) === null || _a === void 0 ? void 0 : _a.getElementsByClassName("playground-sidebar").item(0);
            // Handle dragging all over the screen
            document.addEventListener("mousemove", drag);
            // Remove it when you lt go anywhere
            document.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", drag);
                document.body.style.userSelect = "auto";
            });
            // Don't allow the drag to select text accidentally
            document.body.style.userSelect = "none";
            e.stopPropagation();
            e.cancelBubble = true;
        });
        return sidebar;
    };
    exports.sidebarHidden = () => !!window.localStorage.getItem("sidebar-hidden");
    exports.createSidebar = () => {
        const sidebar = document.createElement("div");
        sidebar.className = "playground-sidebar";
        // Start with the sidebar hidden on small screens
        const isTinyScreen = window.innerWidth < 800;
        // This is independent of the sizing below so that you keep the same sized sidebar
        if (isTinyScreen || exports.sidebarHidden()) {
            sidebar.style.display = "none";
        }
        if (window.localStorage && window.localStorage.getItem("dragbar-x")) {
            // Don't restore the x pos if the window isn't the same size
            if (window.innerWidth === Number(window.localStorage.getItem("dragbar-window-width"))) {
                // Set the dragger to the previous x pos
                let width = window.localStorage.getItem("dragbar-x");
                if (isTinyScreen) {
                    width = String(Math.min(Number(width), 280));
                }
                sidebar.style.width = `${width}px`;
                sidebar.style.flexBasis = `${width}px`;
                sidebar.style.maxWidth = `${width}px`;
                const left = document.getElementById("editor-container");
                left.style.width = `calc(100% - ${width}px)`;
            }
        }
        return sidebar;
    };
    const toggleIconWhenOpen = "&#x21E5;";
    const toggleIconWhenClosed = "&#x21E4;";
    exports.setupSidebarToggle = () => {
        const toggle = document.getElementById("sidebar-toggle");
        const updateToggle = () => {
            const sidebar = window.document.querySelector(".playground-sidebar");
            const sidebarShowing = sidebar.style.display !== "none";
            toggle.innerHTML = sidebarShowing ? toggleIconWhenOpen : toggleIconWhenClosed;
            toggle.setAttribute("aria-label", sidebarShowing ? "Hide Sidebar" : "Show Sidebar");
        };
        toggle.onclick = () => {
            const sidebar = window.document.querySelector(".playground-sidebar");
            const newState = sidebar.style.display !== "none";
            if (newState) {
                localStorage.setItem("sidebar-hidden", "true");
                sidebar.style.display = "none";
            }
            else {
                localStorage.removeItem("sidebar-hidden");
                sidebar.style.display = "block";
            }
            updateToggle();
            // @ts-ignore - I know what I'm doing
            window.sandbox.editor.layout();
            return false;
        };
        // Ensure its set up at the start
        updateToggle();
    };
    exports.createTabBar = () => {
        const tabBar = document.createElement("div");
        tabBar.classList.add("playground-plugin-tabview");
        return tabBar;
    };
    exports.createPluginContainer = () => {
        const container = document.createElement("div");
        container.classList.add("playground-plugin-container");
        return container;
    };
    exports.createTabForPlugin = (plugin) => {
        const element = document.createElement("button");
        element.textContent = plugin.displayName;
        return element;
    };
    exports.activatePlugin = (plugin, previousPlugin, sandbox, tabBar, container) => {
        let newPluginTab, oldPluginTab;
        // @ts-ignore - This works at runtime
        for (const tab of tabBar.children) {
            if (tab.textContent === plugin.displayName)
                newPluginTab = tab;
            if (previousPlugin && tab.textContent === previousPlugin.displayName)
                oldPluginTab = tab;
        }
        // @ts-ignore
        if (!newPluginTab)
            throw new Error("Could not get a tab for the plugin: " + plugin.displayName);
        // Tell the old plugin it's getting the boot
        // @ts-ignore
        if (previousPlugin && oldPluginTab) {
            if (previousPlugin.willUnmount)
                previousPlugin.willUnmount(sandbox, container);
            oldPluginTab.classList.remove("active");
        }
        // Wipe the sidebar
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        // Start booting up the new plugin
        newPluginTab.classList.add("active");
        // Tell the new plugin to start doing some work
        if (plugin.willMount)
            plugin.willMount(sandbox, container);
        if (plugin.modelChanged)
            plugin.modelChanged(sandbox, sandbox.getModel(), container);
        if (plugin.modelChangedDebounce)
            plugin.modelChangedDebounce(sandbox, sandbox.getModel(), container);
        if (plugin.didMount)
            plugin.didMount(sandbox, container);
        // Let the previous plugin do any slow work after it's all done
        if (previousPlugin && previousPlugin.didUnmount)
            previousPlugin.didUnmount(sandbox, container);
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlRWxlbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9jcmVhdGVFbGVtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBSWEsUUFBQSxhQUFhLEdBQUcsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsT0FBTyxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQTtRQUV4QyxJQUFJLElBQWlCLEVBQUUsS0FBa0IsQ0FBQTtRQUN6QyxNQUFNLElBQUksR0FBRyxDQUFDLENBQWEsRUFBRSxFQUFFO1lBQzdCLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRTtnQkFDakIsZ0RBQWdEO2dCQUNoRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxLQUFLLENBQUE7Z0JBQ2xELE1BQU0sTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO2dCQUMvQixNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQTtnQkFDL0MsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFFdEUsaUJBQWlCO2dCQUNqQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxlQUFlLGFBQWEsS0FBSyxDQUFBO2dCQUNwRCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLGFBQWEsSUFBSSxDQUFBO2dCQUN4QyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxHQUFHLGFBQWEsSUFBSSxDQUFBO2dCQUM1QyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxHQUFHLGFBQWEsSUFBSSxDQUFBO2dCQUUzQywr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QUE7UUFFcEMsK0NBQStDO1FBQy9DLElBQUksTUFBTSxDQUFDLFNBQVM7WUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxJQUFJLE1BQU0sQ0FBQyxZQUFZO1lBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BGLElBQUksTUFBTSxDQUFDLG9CQUFvQjtZQUFFLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BHLElBQUksTUFBTSxDQUFDLFFBQVE7WUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUV4RCwrREFBK0Q7UUFDL0QsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFDLFVBQVU7WUFBRSxjQUFjLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNoRyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQbGF5Z3JvdW5kUGx1Z2luIH0gZnJvbSBcIi5cIlxuXG50eXBlIFNhbmRib3ggPSBpbXBvcnQoXCJ0eXBlc2NyaXB0LXNhbmRib3hcIikuU2FuZGJveFxuXG5leHBvcnQgY29uc3QgY3JlYXRlRHJhZ0JhciA9ICgpID0+IHtcbiAgY29uc3Qgc2lkZWJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgc2lkZWJhci5jbGFzc05hbWUgPSBcInBsYXlncm91bmQtZHJhZ2JhclwiXG5cbiAgbGV0IGxlZnQ6IEhUTUxFbGVtZW50LCByaWdodDogSFRNTEVsZW1lbnRcbiAgY29uc3QgZHJhZyA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgaWYgKGxlZnQgJiYgcmlnaHQpIHtcbiAgICAgIC8vIEdldCBob3cgZmFyIHJpZ2h0IHRoZSBtb3VzZSBpcyBmcm9tIHRoZSByaWdodFxuICAgICAgY29uc3QgcmlnaHRYID0gcmlnaHQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkucmlnaHRcbiAgICAgIGNvbnN0IG9mZnNldCA9IHJpZ2h0WCAtIGUucGFnZVhcbiAgICAgIGNvbnN0IHNjcmVlbkNsYW1wTGVmdCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gMzIwXG4gICAgICBjb25zdCBjbGFtcGVkT2Zmc2V0ID0gTWF0aC5taW4oTWF0aC5tYXgob2Zmc2V0LCAyODApLCBzY3JlZW5DbGFtcExlZnQpXG5cbiAgICAgIC8vIFNldCB0aGUgd2lkdGhzXG4gICAgICBsZWZ0LnN0eWxlLndpZHRoID0gYGNhbGMoMTAwJSAtICR7Y2xhbXBlZE9mZnNldH1weClgXG4gICAgICByaWdodC5zdHlsZS53aWR0aCA9IGAke2NsYW1wZWRPZmZzZXR9cHhgXG4gICAgICByaWdodC5zdHlsZS5mbGV4QmFzaXMgPSBgJHtjbGFtcGVkT2Zmc2V0fXB4YFxuICAgICAgcmlnaHQuc3R5bGUubWF4V2lkdGggPSBgJHtjbGFtcGVkT2Zmc2V0fXB4YFxuXG4gICAgICAvLyBTYXZlIHRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlXG4gICAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZSkge1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJkcmFnYmFyLXhcIiwgXCJcIiArIGNsYW1wZWRPZmZzZXQpXG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImRyYWdiYXItd2luZG93LXdpZHRoXCIsIFwiXCIgKyB3aW5kb3cuaW5uZXJXaWR0aClcbiAgICAgIH1cblxuICAgICAgLy8gQHRzLWlnbm9yZSAtIEkga25vdyB3aGF0IEknbSBkb2luZ1xuICAgICAgd2luZG93LnNhbmRib3guZWRpdG9yLmxheW91dCgpXG5cbiAgICAgIC8vIERvbid0IGFsbG93IHNlbGVjdGlvblxuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlXG4gICAgfVxuICB9XG5cbiAgc2lkZWJhci5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGUgPT4ge1xuICAgIGxlZnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVkaXRvci1jb250YWluZXJcIikhXG4gICAgcmlnaHQgPSBzaWRlYmFyLnBhcmVudEVsZW1lbnQ/LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJwbGF5Z3JvdW5kLXNpZGViYXJcIikuaXRlbSgwKSEgYXMgYW55XG4gICAgLy8gSGFuZGxlIGRyYWdnaW5nIGFsbCBvdmVyIHRoZSBzY3JlZW5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGRyYWcpXG4gICAgLy8gUmVtb3ZlIGl0IHdoZW4geW91IGx0IGdvIGFueXdoZXJlXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgKCkgPT4ge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBkcmFnKVxuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS51c2VyU2VsZWN0ID0gXCJhdXRvXCJcbiAgICB9KVxuXG4gICAgLy8gRG9uJ3QgYWxsb3cgdGhlIGRyYWcgdG8gc2VsZWN0IHRleHQgYWNjaWRlbnRhbGx5XG4gICAgZG9jdW1lbnQuYm9keS5zdHlsZS51c2VyU2VsZWN0ID0gXCJub25lXCJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlXG4gIH0pXG5cbiAgcmV0dXJuIHNpZGViYXJcbn1cblxuZXhwb3J0IGNvbnN0IHNpZGViYXJIaWRkZW4gPSAoKSA9PiAhIXdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInNpZGViYXItaGlkZGVuXCIpXG5cbmV4cG9ydCBjb25zdCBjcmVhdGVTaWRlYmFyID0gKCkgPT4ge1xuICBjb25zdCBzaWRlYmFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICBzaWRlYmFyLmNsYXNzTmFtZSA9IFwicGxheWdyb3VuZC1zaWRlYmFyXCJcblxuICAvLyBTdGFydCB3aXRoIHRoZSBzaWRlYmFyIGhpZGRlbiBvbiBzbWFsbCBzY3JlZW5zXG4gIGNvbnN0IGlzVGlueVNjcmVlbiA9IHdpbmRvdy5pbm5lcldpZHRoIDwgODAwXG5cbiAgLy8gVGhpcyBpcyBpbmRlcGVuZGVudCBvZiB0aGUgc2l6aW5nIGJlbG93IHNvIHRoYXQgeW91IGtlZXAgdGhlIHNhbWUgc2l6ZWQgc2lkZWJhclxuICBpZiAoaXNUaW55U2NyZWVuIHx8IHNpZGViYXJIaWRkZW4oKSkge1xuICAgIHNpZGViYXIuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXG4gIH1cblxuICBpZiAod2luZG93LmxvY2FsU3RvcmFnZSAmJiB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJkcmFnYmFyLXhcIikpIHtcbiAgICAvLyBEb24ndCByZXN0b3JlIHRoZSB4IHBvcyBpZiB0aGUgd2luZG93IGlzbid0IHRoZSBzYW1lIHNpemVcbiAgICBpZiAod2luZG93LmlubmVyV2lkdGggPT09IE51bWJlcih3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJkcmFnYmFyLXdpbmRvdy13aWR0aFwiKSkpIHtcbiAgICAgIC8vIFNldCB0aGUgZHJhZ2dlciB0byB0aGUgcHJldmlvdXMgeCBwb3NcbiAgICAgIGxldCB3aWR0aCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImRyYWdiYXIteFwiKVxuXG4gICAgICBpZiAoaXNUaW55U2NyZWVuKSB7XG4gICAgICAgIHdpZHRoID0gU3RyaW5nKE1hdGgubWluKE51bWJlcih3aWR0aCksIDI4MCkpXG4gICAgICB9XG5cbiAgICAgIHNpZGViYXIuc3R5bGUud2lkdGggPSBgJHt3aWR0aH1weGBcbiAgICAgIHNpZGViYXIuc3R5bGUuZmxleEJhc2lzID0gYCR7d2lkdGh9cHhgXG4gICAgICBzaWRlYmFyLnN0eWxlLm1heFdpZHRoID0gYCR7d2lkdGh9cHhgXG5cbiAgICAgIGNvbnN0IGxlZnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVkaXRvci1jb250YWluZXJcIikhXG4gICAgICBsZWZ0LnN0eWxlLndpZHRoID0gYGNhbGMoMTAwJSAtICR7d2lkdGh9cHgpYFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzaWRlYmFyXG59XG5cbmNvbnN0IHRvZ2dsZUljb25XaGVuT3BlbiA9IFwiJiN4MjFFNTtcIlxuY29uc3QgdG9nZ2xlSWNvbldoZW5DbG9zZWQgPSBcIiYjeDIxRTQ7XCJcblxuZXhwb3J0IGNvbnN0IHNldHVwU2lkZWJhclRvZ2dsZSA9ICgpID0+IHtcbiAgY29uc3QgdG9nZ2xlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaWRlYmFyLXRvZ2dsZVwiKSFcblxuICBjb25zdCB1cGRhdGVUb2dnbGUgPSAoKSA9PiB7XG4gICAgY29uc3Qgc2lkZWJhciA9IHdpbmRvdy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnBsYXlncm91bmQtc2lkZWJhclwiKSBhcyBIVE1MRGl2RWxlbWVudFxuICAgIGNvbnN0IHNpZGViYXJTaG93aW5nID0gc2lkZWJhci5zdHlsZS5kaXNwbGF5ICE9PSBcIm5vbmVcIlxuXG4gICAgdG9nZ2xlLmlubmVySFRNTCA9IHNpZGViYXJTaG93aW5nID8gdG9nZ2xlSWNvbldoZW5PcGVuIDogdG9nZ2xlSWNvbldoZW5DbG9zZWRcbiAgICB0b2dnbGUuc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBzaWRlYmFyU2hvd2luZyA/IFwiSGlkZSBTaWRlYmFyXCIgOiBcIlNob3cgU2lkZWJhclwiKVxuICB9XG5cbiAgdG9nZ2xlLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY29uc3Qgc2lkZWJhciA9IHdpbmRvdy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnBsYXlncm91bmQtc2lkZWJhclwiKSBhcyBIVE1MRGl2RWxlbWVudFxuICAgIGNvbnN0IG5ld1N0YXRlID0gc2lkZWJhci5zdHlsZS5kaXNwbGF5ICE9PSBcIm5vbmVcIlxuXG4gICAgaWYgKG5ld1N0YXRlKSB7XG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInNpZGViYXItaGlkZGVuXCIsIFwidHJ1ZVwiKVxuICAgICAgc2lkZWJhci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oXCJzaWRlYmFyLWhpZGRlblwiKVxuICAgICAgc2lkZWJhci5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiXG4gICAgfVxuXG4gICAgdXBkYXRlVG9nZ2xlKClcblxuICAgIC8vIEB0cy1pZ25vcmUgLSBJIGtub3cgd2hhdCBJJ20gZG9pbmdcbiAgICB3aW5kb3cuc2FuZGJveC5lZGl0b3IubGF5b3V0KClcblxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gRW5zdXJlIGl0cyBzZXQgdXAgYXQgdGhlIHN0YXJ0XG4gIHVwZGF0ZVRvZ2dsZSgpXG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVUYWJCYXIgPSAoKSA9PiB7XG4gIGNvbnN0IHRhYkJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgdGFiQmFyLmNsYXNzTGlzdC5hZGQoXCJwbGF5Z3JvdW5kLXBsdWdpbi10YWJ2aWV3XCIpXG4gIHJldHVybiB0YWJCYXJcbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVBsdWdpbkNvbnRhaW5lciA9ICgpID0+IHtcbiAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICBjb250YWluZXIuY2xhc3NMaXN0LmFkZChcInBsYXlncm91bmQtcGx1Z2luLWNvbnRhaW5lclwiKVxuICByZXR1cm4gY29udGFpbmVyXG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVUYWJGb3JQbHVnaW4gPSAocGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB7XG4gIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpXG4gIGVsZW1lbnQudGV4dENvbnRlbnQgPSBwbHVnaW4uZGlzcGxheU5hbWVcbiAgcmV0dXJuIGVsZW1lbnRcbn1cblxuZXhwb3J0IGNvbnN0IGFjdGl2YXRlUGx1Z2luID0gKFxuICBwbHVnaW46IFBsYXlncm91bmRQbHVnaW4sXG4gIHByZXZpb3VzUGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luIHwgdW5kZWZpbmVkLFxuICBzYW5kYm94OiBTYW5kYm94LFxuICB0YWJCYXI6IEhUTUxEaXZFbGVtZW50LFxuICBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50XG4pID0+IHtcbiAgbGV0IG5ld1BsdWdpblRhYjogRWxlbWVudCwgb2xkUGx1Z2luVGFiOiBFbGVtZW50XG4gIC8vIEB0cy1pZ25vcmUgLSBUaGlzIHdvcmtzIGF0IHJ1bnRpbWVcbiAgZm9yIChjb25zdCB0YWIgb2YgdGFiQmFyLmNoaWxkcmVuKSB7XG4gICAgaWYgKHRhYi50ZXh0Q29udGVudCA9PT0gcGx1Z2luLmRpc3BsYXlOYW1lKSBuZXdQbHVnaW5UYWIgPSB0YWJcbiAgICBpZiAocHJldmlvdXNQbHVnaW4gJiYgdGFiLnRleHRDb250ZW50ID09PSBwcmV2aW91c1BsdWdpbi5kaXNwbGF5TmFtZSkgb2xkUGx1Z2luVGFiID0gdGFiXG4gIH1cblxuICAvLyBAdHMtaWdub3JlXG4gIGlmICghbmV3UGx1Z2luVGFiKSB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZ2V0IGEgdGFiIGZvciB0aGUgcGx1Z2luOiBcIiArIHBsdWdpbi5kaXNwbGF5TmFtZSlcblxuICAvLyBUZWxsIHRoZSBvbGQgcGx1Z2luIGl0J3MgZ2V0dGluZyB0aGUgYm9vdFxuICAvLyBAdHMtaWdub3JlXG4gIGlmIChwcmV2aW91c1BsdWdpbiAmJiBvbGRQbHVnaW5UYWIpIHtcbiAgICBpZiAocHJldmlvdXNQbHVnaW4ud2lsbFVubW91bnQpIHByZXZpb3VzUGx1Z2luLndpbGxVbm1vdW50KHNhbmRib3gsIGNvbnRhaW5lcilcbiAgICBvbGRQbHVnaW5UYWIuY2xhc3NMaXN0LnJlbW92ZShcImFjdGl2ZVwiKVxuICB9XG5cbiAgLy8gV2lwZSB0aGUgc2lkZWJhclxuICB3aGlsZSAoY29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcbiAgICBjb250YWluZXIucmVtb3ZlQ2hpbGQoY29udGFpbmVyLmZpcnN0Q2hpbGQpXG4gIH1cblxuICAvLyBTdGFydCBib290aW5nIHVwIHRoZSBuZXcgcGx1Z2luXG4gIG5ld1BsdWdpblRhYi5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpXG5cbiAgLy8gVGVsbCB0aGUgbmV3IHBsdWdpbiB0byBzdGFydCBkb2luZyBzb21lIHdvcmtcbiAgaWYgKHBsdWdpbi53aWxsTW91bnQpIHBsdWdpbi53aWxsTW91bnQoc2FuZGJveCwgY29udGFpbmVyKVxuICBpZiAocGx1Z2luLm1vZGVsQ2hhbmdlZCkgcGx1Z2luLm1vZGVsQ2hhbmdlZChzYW5kYm94LCBzYW5kYm94LmdldE1vZGVsKCksIGNvbnRhaW5lcilcbiAgaWYgKHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZSkgcGx1Z2luLm1vZGVsQ2hhbmdlZERlYm91bmNlKHNhbmRib3gsIHNhbmRib3guZ2V0TW9kZWwoKSwgY29udGFpbmVyKVxuICBpZiAocGx1Z2luLmRpZE1vdW50KSBwbHVnaW4uZGlkTW91bnQoc2FuZGJveCwgY29udGFpbmVyKVxuXG4gIC8vIExldCB0aGUgcHJldmlvdXMgcGx1Z2luIGRvIGFueSBzbG93IHdvcmsgYWZ0ZXIgaXQncyBhbGwgZG9uZVxuICBpZiAocHJldmlvdXNQbHVnaW4gJiYgcHJldmlvdXNQbHVnaW4uZGlkVW5tb3VudCkgcHJldmlvdXNQbHVnaW4uZGlkVW5tb3VudChzYW5kYm94LCBjb250YWluZXIpXG59XG4iXX0=