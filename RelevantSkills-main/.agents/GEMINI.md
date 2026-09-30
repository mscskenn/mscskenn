   Agent guidelines

  ## Communication

  Apply the unslop skill to every response, code comment, and document.

  • Answer directly without filler, pleasantries, or apologies.
  • Use plain words. Cut words like delve, pivotal, intricate, foster, enhance, and utilize.
  • Name concrete mechanisms and numbers instead of feelings.
  • Prefer active voice and short sentences.
  • Do not use em dashes. Use periods or commas.
  • Use sentence case for headings. Avoid decorative emojis.
  • Use straight quotes.

  ## Skill triggers

  Activate installed skills based on the task:

  • unslop: Always active across all conversation and generated text.
  • frontend-design: Use when creating new UI, setting up color palettes, pairing typefaces, or shaping layouts.
  • shadcn: Use when adding, styling, or composing UI components, form controls, and chat elements.

  ## Frontend and component rules

  • Create intentional visual identities. Avoid generic AI design defaults.
  • Check installed components and docs via CLI before writing UI code.
  • Use semantic color tokens like bg-background and text-muted-foreground.
  • Use flex with gap-* instead of space-x-* or space-y-*. Use size-* for equal dimensions.
  • Build forms with <FieldGroup> and <Field> using data-invalid and aria-invalid.
  • Place icons inside controls using data-icon instead of manual sizing classes.
