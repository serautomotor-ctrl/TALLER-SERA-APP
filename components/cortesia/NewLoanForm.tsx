"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/inputs";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { createLoan } from "@/app/cortesia/actions";

import { FUEL_LEVELS } from "@/lib/fuel";

type Order = { id: string; plate: string; clientName: string; phone: string };

export function NewLoanForm({ cars, orders }: { cars: { id: string; label: string }[]; orders: Order[] }) {
  const [carId, setCarId] = useState(cars[0]?.id || "");
  const [orderId, setOrderId] = useState("");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [clientPlate, setClientPlate] = useState("");
  const [expectedBack, setExpectedBack] = useState("");
  const [kmOut, setKmOut] = useState("");
  const [fuelOut, setFuelOut] = useState("Lleno");
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [saving, start] = useTransition();

  if (!cars.length) return <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Todos los coches de cortesia estan prestados (o no hay ninguno dado de alta).</p>;

  const submit = () =>
    start(async () => {
      setError("");
      const res = await createLoan({ carId, clientName, phone, clientPlate, orderId, expectedBack, kmOut, fuelOut, notes, signatureUrl: signature });
      if (res.error) return setError(res.error);
      setClientName("");
      setPhone("");
      setClientPlate("");
      setOrderId("");
      setKmOut("");
      setNotes("");
      setSignature("");
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="two-col" style={{ gap: 8 }}>
        <Field label="Coche">
          <Select value={carId} onChange={(e) => setCarId(e.target.value)}>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Orden del cliente (opcional)">
          <Select
            value={orderId}
            onChange={(e) => {
              setOrderId(e.target.value);
              const o = orders.find((x) => x.id === e.target.value);
              if (o) {
                setClientPlate(o.plate);
                if (o.clientName) setClientName(o.clientName);
                if (o.phone) setPhone(o.phone);
              }
            }}
          >
            <option value="">Ninguna</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.plate} {o.clientName && `· ${o.clientName}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cliente">
          <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre y apellidos" />
        </Field>
        <Field label="Telefono">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Matricula del coche del cliente">
          <TextInput value={clientPlate} onChange={(e) => setClientPlate(e.target.value)} style={{ textTransform: "uppercase" }} />
        </Field>
        <Field label="Devolucion prevista">
          <TextInput type="date" value={expectedBack} onChange={(e) => setExpectedBack(e.target.value)} />
        </Field>
        <Field label="Km de salida">
          <TextInput type="number" value={kmOut} onChange={(e) => setKmOut(e.target.value)} />
        </Field>
        <Field label="Combustible de salida">
          <Select value={fuelOut} onChange={(e) => setFuelOut(e.target.value)}>
            {FUEL_LEVELS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Field>
      </div>
      <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Danos que ya tiene, observaciones..." />
      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>
        Firma del cliente: se compromete a devolver el coche en el mismo estado y se hace cargo de multas y danos durante el prestamo.
      </p>
      {signature ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signature} alt="Firma" style={{ width: 180, background: "#fff", borderRadius: 6 }} />
          <Button type="button" variant="ghost" onClick={() => setSignature("")}>
            Repetir firma
          </Button>
        </div>
      ) : (
        <SignaturePad saveLabel="Usar esta firma" onSave={setSignature} height={140} />
      )}
      {error && <p style={{ margin: 0, color: "var(--color-danger)", fontSize: 12.5 }}>{error}</p>}
      <Button type="button" variant="primary" disabled={saving} onClick={submit}>
        {saving ? "Guardando..." : "Entregar coche de cortesia"}
      </Button>
    </div>
  );
}
