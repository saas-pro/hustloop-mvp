import Image from "next/image";
import { iconColumns } from "./icons";
import styles from "./page.styles.module.css"; // <-- CSS Module import

export default function AnimatedColumns() {
  return (
    <section className={styles.left} aria-label="AI icon animation">
      <div className={styles.columns} aria-hidden="true">
        {iconColumns.map((icons, colIndex) => (
          <div key={colIndex} className={styles.col}>
            <div className={styles.track}>
              {/* Original stack */}
              <div className={styles.stack}>
                {icons.map((icon, idx) => (
                  <div key={idx} className={styles.icon}>
                    <Image
                      src={`${icon}.png`}
                      alt={icon}
                      width={112}
                      height={112}
                    />
                  </div>
                ))}
              </div>
              {/* Duplicate stack */}
              <div className={styles.stack}>
                {icons.map((icon, idx) => (
                  <div key={idx} className={styles.icon}>
                    <Image
                      src={`${icon}.png`}
                      alt={icon}
                      width={112}
                      height={112}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
