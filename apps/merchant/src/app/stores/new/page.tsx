"use client";
import { Shell } from "../../../components/Shell";
import { StoreEditor } from "../../../components/StoreEditor";
export default function NewStore() {
  return (
    <Shell>
      {() => (
        <>
          <div className="page-heading">
            <div>
              <span className="eyebrow">A NEW BEGINNING</span>
              <h1>Let’s build your store.</h1>
              <p>Give your idea a name. Make the rest your own.</p>
            </div>
          </div>
          <StoreEditor />
        </>
      )}
    </Shell>
  );
}
