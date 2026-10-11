import type { FurnitureModel } from '../furniture'

type Props = {
  options: FurnitureModel[]
  selectedId: string
  onSelect: (id: string) => void
}

export function FurniturePicker({ options, selectedId, onSelect }: Props) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Valitse huonekalu</legend>
      {options.map((option) => (
        <label
          key={option.id}
          className="cursor-pointer rounded-full border border-line px-5 py-2.5 text-base text-muted transition-colors hover:border-ink hover:text-ink has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
        >
          <input
            type="radio"
            name="huonekalu"
            value={option.id}
            checked={option.id === selectedId}
            onChange={() => onSelect(option.id)}
            className="sr-only"
          />
          {option.name}
        </label>
      ))}
    </fieldset>
  )
}
