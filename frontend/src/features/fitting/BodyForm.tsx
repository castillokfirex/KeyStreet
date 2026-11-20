import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { useFitProfileStore } from "@/stores/fitProfile";
import { bodyProfileSchema, type BodyProfileFormValues } from "./bodyParams";

export function BodyForm() {
  const heightCm = useFitProfileStore((s) => s.heightCm);
  const build = useFitProfileStore((s) => s.build);
  const usualSizeEu = useFitProfileStore((s) => s.usualSizeEu);
  const setManualProfile = useFitProfileStore((s) => s.setManualProfile);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BodyProfileFormValues>({
    resolver: zodResolver(bodyProfileSchema),
    values: { heightCm, build, usualSizeEu },
  });

  const onSubmit = (values: BodyProfileFormValues) => {
    setManualProfile(values);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end"
    >
      <div className="space-y-1">
        <label
          htmlFor="fit-height"
          className="block font-display text-[10px] font-bold uppercase tracking-wider text-navy"
        >
          Estatura (cm)
        </label>
        <input
          id="fit-height"
          type="number"
          min={140}
          max={210}
          {...register("heightCm", { valueAsNumber: true })}
          className="h-9 w-full rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-navy focus:border-navy focus:outline-none"
        />
        {errors.heightCm && (
          <p className="text-[10px] text-red-700">{errors.heightCm.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="fit-build"
          className="block font-display text-[10px] font-bold uppercase tracking-wider text-navy"
        >
          Complexión
        </label>
        <select
          id="fit-build"
          {...register("build")}
          className="h-9 w-full rounded-xl border border-line bg-surface px-2.5 text-xs font-semibold text-navy focus:border-navy focus:outline-none"
        >
          <option value="delgada">Delgada</option>
          <option value="media">Media</option>
          <option value="atletica">Atlética</option>
          <option value="robusta">Robusta</option>
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="fit-size"
          className="block font-display text-[10px] font-bold uppercase tracking-wider text-navy"
        >
          Talla habitual (EU)
        </label>
        <select
          id="fit-size"
          {...register("usualSizeEu", { valueAsNumber: true })}
          className="h-9 w-full rounded-xl border border-line bg-surface px-2.5 text-xs font-semibold text-navy focus:border-navy focus:outline-none"
        >
          {[36, 37, 38, 39, 40, 41, 42, 43, 44].map((s) => (
            <option key={s} value={s}>
              EU {s}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="navy" size="sm" fullWidth>
        Aplicar medidas
      </Button>
    </form>
  );
}
