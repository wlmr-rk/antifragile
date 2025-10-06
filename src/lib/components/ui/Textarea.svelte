<script lang="ts">
  interface Props {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    maxlength?: number;
    rows?: number;
    id?: string;
    class?: string;
  }
  
  let {
    value = $bindable(""),
    placeholder = "",
    disabled = false,
    maxlength,
    rows = 3,
    id,
    class: className = ""
  }: Props = $props();
</script>

<textarea
  bind:value
  {placeholder}
  {disabled}
  {maxlength}
  {rows}
  {id}
  class="textarea {className}"
></textarea>

<style>
  .textarea {
    width: 100%;
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 500;
    font-family: inherit;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: var(--color-text-primary);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    outline: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 
      inset 0 2px 6px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.02);
    resize: vertical;
    min-height: 80px;
  }

  .textarea::placeholder {
    color: var(--color-text-muted);
  }

  .textarea:focus {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--color-accent);
    box-shadow: 
      inset 0 2px 6px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.02),
      0 0 0 3px rgba(167, 139, 250, 0.15),
      0 0 20px rgba(167, 139, 250, 0.2);
  }

  .textarea:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
