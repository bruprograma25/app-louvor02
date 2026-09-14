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
                    email: email,
                    senha: senha
                }
            );

            console.log(
                "LOGIN:",
                resposta.data
            );

            /*
             * IMPORTANTE:
             * Salvamos o objeto inteiro do usuário.
             *
             * Assim também será salvo:
             * tipo_usuario = admin ou membro
             */

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

            console.error(
                "Erro no login:",
                error
            );

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

                        <label>
                            E-mail
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            placeholder="Digite seu e-mail"
                            autoComplete="email"
                        />

                    </div>


                    <div className="campo">

                        <label>
                            Senha
                        </label>

                        <input
                            type="password"
                            value={senha}
                            onChange={(event) =>
                                setSenha(
                                    event.target.value
                                )
                            }
                            placeholder="Digite sua senha"
                            autoComplete="current-password"
                        />

                    </div>


                    {erro && (

                        <div className="mensagem-erro">

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