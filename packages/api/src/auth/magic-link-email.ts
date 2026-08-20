/**
 * Contenido del correo del enlace mágico.
 *
 * Los clientes de correo no entienden lo que entiende el sitio: aquí todo va en
 * tabla y con estilos en línea. La dirección visual es la misma —negro, papel y
 * un solo acento— pero escrita a mano.
 */

const INK = "#0b0b0b"
const PAPER = "#fafaf7"
const VOLT = "#e4ff32"
const MUTED = "#8a8a83"
const SANS = "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"

export interface MagicLinkEmail {
  subject: string
  html: string
  text: string
}

export function renderMagicLinkEmail(url: string): MagicLinkEmail {
  return {
    subject: "Tu enlace para entrar a 33rpm",
    html: `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${INK};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:${INK};border:2px solid ${PAPER};">
            <tr>
              <td style="padding:32px;font-family:${SANS};color:${PAPER};">
                <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${VOLT};">33rpm · Acceso</p>
                <h1 style="margin:16px 0 0;font-size:34px;line-height:1.05;text-transform:uppercase;color:${PAPER};">
                  Entra sin contraseña
                </h1>
                <p style="margin:20px 0 0;font-size:16px;line-height:1.6;color:${PAPER};">
                  Pediste un enlace para entrar a la tienda. Es de un solo uso y vale por
                  <strong>diez minutos</strong>.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
                  <tr>
                    <td style="background-color:${VOLT};">
                      <a href="${url}" style="display:block;padding:16px 28px;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${INK};text-decoration:none;">
                        Entrar a 33rpm
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">
                  Si el botón no funciona, copia esta dirección en tu navegador:
                </p>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;color:${VOLT};">
                  ${url}
                </p>
                <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${MUTED};font-size:13px;line-height:1.6;color:${MUTED};">
                  Si no pediste este enlace, ignora el correo: sin abrirlo no se crea ninguna sesión.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: [
      "33rpm · Acceso",
      "",
      "Pediste un enlace para entrar a la tienda. Es de un solo uso y vale por diez minutos.",
      "",
      url,
      "",
      "Si no pediste este enlace, ignora el correo: sin abrirlo no se crea ninguna sesión.",
    ].join("\n"),
  }
}
