/**
 * Wandelt ```mermaid-Codeblöcke in <pre class="mermaid"> um, bevor Expressive Code sie als Quelltext formatiert.
 * Gezeichnet werden die Diagramme im Browser (src/components/Head.astro lädt Mermaid nur bei Bedarf).
 */
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function remarkMermaid() {
  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) =>
        child.type === 'code' && child.lang === 'mermaid'
          ? { type: 'html', value: `<pre class="mermaid not-content">${escape(child.value)}</pre>` }
          : (walk(child), child),
      );
    };
    walk(tree);
  };
}
