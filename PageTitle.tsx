import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  return (
    <h1 class={classNames(displayClass, "page-title")}>
      <a href="/">{title}</a>
      {/* Sun — shown in dark mode, click to go light */}
      <button class="title-toggle title-toggle-light" id="title-toggle-sun" title="Mudar para modo claro" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35" width="20" height="20">
          <path d="M6,17.5A1.5,1.5,0,0,1,4.5,16h-2a1.5,1.5,0,0,1,0-3h2A1.5,1.5,0,0,1,6,14.5h0A1.5,1.5,0,0,1,4.5,16h0A1.5,1.5,0,0,1,6,17.5ZM30.5,16a1.5,1.5,0,0,0,1.5-1.5h0A1.5,1.5,0,0,0,30.5,13h-2a1.5,1.5,0,0,0,0,3Zm-22.6-7.1a1.49,1.49,0,0,1,0-2.12L6.49,5.37A1.5,1.5,0,0,1,8.61,7.49L7.2,8.9A1.5,1.5,0,0,1,5.08,8.9h0A1.5,1.5,0,0,1,7.9,8.9ZM28,27.63a1.5,1.5,0,0,0,0-2.12L26.6,24.1a1.5,1.5,0,0,0-2.12,2.12L25.89,27.63A1.49,1.49,0,0,0,28,27.63ZM17.5,6A1.5,1.5,0,0,1,16,4.5v-2a1.5,1.5,0,0,1,3,0v2A1.5,1.5,0,0,1,17.5,6ZM16,30.5a1.5,1.5,0,0,0,3,0v-2a1.5,1.5,0,0,0-3,0Zm-7.1-.87a1.5,1.5,0,0,1,0-2.12L10.31,26.1A1.5,1.5,0,0,1,8.2,28.21L6.78,29.63A1.49,1.49,0,0,1,4.67,27.51L6.08,26.1A1.5,1.5,0,0,1,8.2,26.1h0A1.5,1.5,0,0,1,8.9,29.63ZM26.6,8.9a1.5,1.5,0,0,0,2.12,0,1.49,1.49,0,0,0,0-2.12L27.31,5.37A1.5,1.5,0,0,0,25.2,7.49ZM17.5,10A7.5,7.5,0,1,0,25,17.5,7.5,7.5,0,0,0,17.5,10Z" />
        </svg>
      </button>
      {/* Moon — shown in light mode, click to go dark */}
      <button class="title-toggle title-toggle-dark" id="title-toggle-moon" title="Mudar para modo escuro" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="20" height="20">
          <path d="M96.76,66.458c-6.814-1.049-13.1-4.086-18.13-8.8a37.37,37.37,0,0,1-9.626-15.676,36.886,36.886,0,0,1,1.818-23.135c.993-2.382,2.2-4.659,3.491-6.869a2.5,2.5,0,0,0-3.2-3.595A48.507,48.507,0,0,0,27.7,97.783a48.031,48.031,0,0,0,22.4,5.519,47.734,47.734,0,0,0,27.463-8.646,49.488,49.488,0,0,0,19.944-26.916A2.56,2.56,0,0,0,96.76,66.458Z" />
        </svg>
      </button>
    </h1>
  )
}

PageTitle.afterDOMLoaded = `
  function _titleToggleTheme() {
    var current = document.documentElement.getAttribute("saved-theme") || "dark";
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("saved-theme", next);
    localStorage.setItem("theme", next);
    var toggle = document.getElementById("darkmode-toggle");
    if (toggle) toggle.checked = (next === "dark");
  }

  document.addEventListener("nav", function() {
    var sun  = document.getElementById("title-toggle-sun");
    var moon = document.getElementById("title-toggle-moon");
    if (sun)  { sun.removeEventListener("click",  _titleToggleTheme); sun.addEventListener("click",  _titleToggleTheme); }
    if (moon) { moon.removeEventListener("click", _titleToggleTheme); moon.addEventListener("click", _titleToggleTheme); }
  });
`

PageTitle.displayName = "PageTitle"
export default (() => PageTitle) satisfies QuartzComponentConstructor
