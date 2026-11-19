/* Local shim: inside claude.ai artifacts window.claude.use() provides capabilities.
Outside it, give the page a 'downloads' capability that saves via a normal link; 'sample' (Claude calls) stays unavailable,
so pages fall back to their built-in rules. */
if (!window.claude) {
  window.claude = {
    use: async (n) =>
      n === 'downloads'
        ? {
            save: async ({filename, data}) => {
              const b = data instanceof Blob ? data : new Blob([data]);
              const a = document.createElement('a');
              a.href = URL.createObjectURL(b);
              a.download = filename;
              document.body.append(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(a.href), 4000);
              return {status: 'saved'};
            },
          }
        : null,
  };
}
