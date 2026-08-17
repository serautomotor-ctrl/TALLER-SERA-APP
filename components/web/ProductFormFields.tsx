import { Field, Select, TextArea, TextInput } from "@/components/ui/inputs";

type Defaults = {
  name?: string;
  category?: string;
  brand?: string;
  price?: number;
  condition?: string;
  description?: string;
};

export function ProductFormFields({ defaults }: { defaults?: Defaults }) {
  const d = defaults || {};
  return (
    <>
      <Field label="Nombre del producto">
        <TextInput name="name" placeholder="Pastillas de freno delanteras" defaultValue={d.name} required />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Categoria">
          <TextInput name="category" placeholder="Frenos, neumaticos, baterias..." defaultValue={d.category} />
        </Field>
        <Field label="Marca / referencia (opcional)">
          <TextInput name="brand" placeholder="Bosch, Brembo..." defaultValue={d.brand} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Precio (€)">
          <TextInput name="price" type="number" min="0" step="0.01" placeholder="45" defaultValue={d.price ?? ""} required />
        </Field>
        <Field label="Estado">
          <Select name="condition" defaultValue={d.condition || "nuevo"}>
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
            <option value="reacondicionado">Reacondicionado</option>
          </Select>
        </Field>
      </div>
      <Field label="Descripcion">
        <TextArea name="description" placeholder="Compatibilidad, detalles, observaciones..." defaultValue={d.description} />
      </Field>
    </>
  );
}
