import { Field, Select, TextArea, TextInput } from "@/components/ui/inputs";

type Defaults = {
  brand?: string;
  model?: string;
  year?: number | null;
  mileage?: number | null;
  price?: number;
  fuel?: string;
  transmission?: string;
  power?: string;
  color?: string;
  doors?: number | null;
  owners?: number | null;
  warrantyMonths?: number;
  extras?: string;
  description?: string;
};

export function VehicleFormFields({ defaults }: { defaults?: Defaults }) {
  const d = defaults || {};
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Marca">
          <TextInput name="brand" placeholder="Seat, Renault..." defaultValue={d.brand} required />
        </Field>
        <Field label="Modelo">
          <TextInput name="model" placeholder="Ibiza, Clio..." defaultValue={d.model} required />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Año">
          <TextInput name="year" type="number" min="1980" placeholder="2018" defaultValue={d.year ?? ""} />
        </Field>
        <Field label="Kilometraje">
          <TextInput name="mileage" type="number" min="0" placeholder="85000" defaultValue={d.mileage ?? ""} />
        </Field>
        <Field label="Precio (€)">
          <TextInput name="price" type="number" min="0" step="0.01" placeholder="8900" defaultValue={d.price ?? ""} required />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Combustible">
          <Select name="fuel" defaultValue={d.fuel || "otro"}>
            <option value="gasolina">Gasolina</option>
            <option value="diesel">Diesel</option>
            <option value="hibrido">Hibrido</option>
            <option value="electrico">Electrico</option>
            <option value="glp">GLP</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <Field label="Cambio">
          <Select name="transmission" defaultValue={d.transmission || "manual"}>
            <option value="manual">Manual</option>
            <option value="automatico">Automatico</option>
          </Select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Potencia (CV, opcional)">
          <TextInput name="power" placeholder="90 CV" defaultValue={d.power} />
        </Field>
        <Field label="Color">
          <TextInput name="color" placeholder="Blanco" defaultValue={d.color} />
        </Field>
        <Field label="Puertas">
          <TextInput name="doors" type="number" min="1" max="7" placeholder="5" defaultValue={d.doors ?? ""} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Numero de propietarios">
          <TextInput name="owners" type="number" min="1" placeholder="1" defaultValue={d.owners ?? ""} />
        </Field>
        <Field label="Garantia (meses)">
          <TextInput name="warrantyMonths" type="number" min="0" placeholder="12" defaultValue={d.warrantyMonths ?? 0} />
        </Field>
      </div>
      <Field label="Extras / equipamiento (opcional)">
        <TextInput name="extras" placeholder="Aire acondicionado, navegador, sensores..." defaultValue={d.extras} />
      </Field>
      <Field label="Descripcion">
        <TextArea name="description" placeholder="Estado general, historial, observaciones..." defaultValue={d.description} />
      </Field>
    </>
  );
}
