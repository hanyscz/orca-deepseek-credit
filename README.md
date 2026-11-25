# DeepSeek Credit

![DeepSeek Credit pro Orca](assets/cover.png)

Malý plugin pro [Orcu](https://github.com/stablyai/orca), který ukazuje **zbývající kredit na platformě DeepSeek**
přímo ve stavovém řádku, například `DeepSeek $12.48`. Kliknutím na položku se kredit hned obnoví.

## Co plugin ukazuje

- **Stavový řádek:** aktuální zůstatek účtu DeepSeek. Pokud účet vede zůstatek v USD, ukáže se jen USD. Jinak se
  ukážou všechny měny (`¥` pro CNY, ostatní s kódem měny).
- **Tooltip:** celý zůstatek a nápověda, že kliknutím kredit obnovíš.
- **Varování:** bez klíče, s neplatným klíčem nebo při chybě sítě se položka přepne na varovnou ikonu a barvu
  a tooltip řekne, co se stalo (`Neplatný API klíč`, `HTTP 500` a podobně).

Je to zůstatek celého účtu DeepSeek, nezávisle na tom, který agent nebo aplikace kredit utratili.

## Nastavení

V nastavení pluginu v Orce:

| Klíč | Popis | Výchozí |
| --- | --- | --- |
| `apiKey` | API klíč z [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) | prázdný |
| `refreshMinutes` | Jak často se kredit znovu načítá (1 až 120 minut) | 5 |

Po změně nastavení se kredit načte znovu a interval obnovy se přenastaví.

Kredit lze obnovit také příkazem **DeepSeek Credit: Obnovit kredit** z palety příkazů.

## Soukromí a síť

- Jediný odchozí požadavek je `GET https://api.deepseek.com/user/balance` s tvým klíčem. Požadavek má časový limit
  8 sekund.
- Klíč je uložený v nastavení pluginu v Orce a nikam jinam se neposílá. Plugin neobsahuje žádnou analytiku ani
  telemetrii.

## Požadavky

- Orca `>=1.4.268`

## Vývoj

```bash
orca plugin dev watch .
orca plugin validate .
```

Náhledový obrázek `assets/cover.png` se generuje z `assets/cover.html`. Stačí stránku vyrenderovat v headless Chrome
s oknem 1600×900:

```bash
chrome --headless=new --hide-scrollbars --window-size=1600,900 --screenshot=assets/cover.png assets/cover.html
```

## Licence

[MIT](LICENSE) © 2026 Lukas Hanak
