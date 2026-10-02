import { useState } from "react";
import "./login.css";
import { api } from "../../api";

function Login() {

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");

    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    async function fazerLogin(event) {

        event.preventDefault();

        setErro("");

        if (!email || !senha) {

            setErro("Preencha o e-mail e a senha.");

            return;
        }

        try {

            setCarregando(true);

            const resposta = await api.post(
                "/api/login",
                {
                    email: email.trim().toLowerCase(),
                    senha: senha
                }
            );

            localStorage.setItem(
                "usuario",
                JSON.stringify(
                    resposta.data.usuario
                )
            );
            localStorage.setItem(
                "token",
                resposta.data.token
            );

            window.location.href = "/";

        } catch (error) {
            if (
                error.response &&
                error.response.data
            ) {

                setErro(
                    error.response.data.erro ||
                    "E-mail ou senha incorretos."
                );

            } else {

                setErro(
                    "Erro ao conectar com o servidor."
                );

            }

        } finally {

            setCarregando(false);

        }

    }

    return (

        <div className="pagina-login">

            <div className="login-card">

                <div className="login-logo">

                    🎵

                </div>

                <h1>
                    Louvor App
                </h1>

                <p className="login-subtitulo">
                    Entre na sua conta
                </p>


                <form onSubmit={fazerLogin}>

                    <div className="campo">

                        <label htmlFor="login-email">
                            E-mail
                        </label>

                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            placeholder="Digite seu e-mail"
                            autoComplete="email"
                            required
                            aria-invalid={Boolean(erro)}
                            aria-describedby={erro ? "login-error" : undefined}
                        />

                    </div>


                    <div className="campo">

                        <label htmlFor="login-password">
                            Senha
                        </label>

                        <input
                            id="login-password"
                            type="password"
                            value={senha}
                            onChange={(event) =>
                                setSenha(
                                    event.target.value
                                )
                            }
                            placeholder="Digite sua senha"
                            autoComplete="current-password"
                            required
                            aria-invalid={Boolean(erro)}
                            aria-describedby={erro ? "login-error" : undefined}
                        />

                    </div>


                    {erro && (

                        <div id="login-error" className="mensagem-erro" role="alert">

                            {erro}

                        </div>

                    )}


                    <button
                        type="submit"
                        className="btn-login"
                        disabled={carregando}
                    >

                        {carregando
                            ? "Entrando..."
                            : "Entrar"}

                    </button>

                </form>

                <button
                    type="button"
                    className="link-login"
                    onClick={() => {
                        window.location.href = "/cadastro";
                    }}
                >
                    Criar uma conta
                </button>

            </div>

        </div>

    );
}

export default Login;