import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "Vault One",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "pt-BR",
    baseUrl: "gms-gms.n88h5z.easypanel.host",
    ignorePatterns: [".obsidian", "private", "01-Templates"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Rubik",
        body: "Rubik",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#f5f3fc",
          lightgray: "#e4e0ef",
          gray: "#8a85a8",
          darkgray: "#3d3950",
          dark: "#1a1630",
          secondary: "#0891b2",
          tertiary: "#2563eb",
          highlight: "rgba(14, 210, 247, 0.12)",
          textHighlight: "rgba(244, 86, 157, 0.20)",
        },
        darkMode: {
          light: "#100e17",
          lightgray: "#191621",
          gray: "#3a3750",
          darkgray: "#bebebe",
          dark: "#cbdbe5",
          secondary: "#0fb6d6",
          tertiary: "#6bcafb",
          highlight: "rgba(14, 210, 247, 0.15)",
          textHighlight: "rgba(244, 86, 157, 0.25)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({ priority: ["frontmatter", "filesystem"] }),
      Plugin.SyntaxHighlighting({
        theme: { light: "github-light", dark: "dracula" },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({ enableSiteMap: true, enableRSS: true }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
