export function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={"px-3 py-2 rounded-md border text-sm hover:bg-gray-50 " + (props.className || "")}
    />
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"rounded-xl border bg-white shadow-sm " + className}>{children}</div>;
}
export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"p-4 " + className}>{children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={"h-9 px-3 rounded-md border w-full text-sm outline-none focus:ring " + (props.className || "")}
    />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={"animate-pulse rounded-md bg-gray-200 " + className} />;
}

// tiny toast fallback
export const toast = {
  success: (m: string) => { console.log(m); alert(m); },
  error:   (m: string) => { console.error(m); alert(m); },
};
