import { useState } from "react";
import "./login.css";
import logoIgreja from "../../assets/images/logo-igreja.png";

function Login() {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [formulario, setFormulario] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });

  

  function handleChange(event) {
    const { name, value } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }
  async function cadastrar(event) {
    event.preventDefault();

    // Evita dois cadastros ao mesmo tempo
    if (carregando) {
      return;
    }

    const nome = formulario.nome.trim();
    const sobrenome = formulario.sobrenome.trim();
    const email = formulario.email.trim().toLowerCase();
    const senha = formulario.senha;
    const confirmarSenha = formulario.confirmarSenha;

    
    if (!nome) {
      alert("Digite seu nome.");
      return;
    }

    if (!sobrenome) {
      alert("Digite seu sobrenome.");
      return;
    }

    if (!email) {
      alert("Digite seu e-mail.");
      return;
    }

    if (!senha) {
      alert("Digite sua senha.");
      return;
    }

    if (senha.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (!confirmarSenha) {
      alert("Confirme sua senha.");
      return;
    }

    if (senha !== confirmarSenha) {
      alert("As senhas não são iguais!");
      return;
    }

    
    const dados = {
      nome,
      sobrenome,
      email,
      senha,
      confirmarSenha,
    };

    console.log("DADOS ENVIADOS PARA O FLASK:");
    console.log({
      ...dados,
      senha: "********",
      confirmarSenha: "********",
    });

    setCarregando(true);

    try {
 

      const resposta = await fetch(
        "http://127.0.0.1:5000/api/cadastro",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(dados),
        }
      );

      const resultado = await resposta.json();

      console.log("RESPOSTA DO FLASK:");
      console.log(resultado);

    

      if (!resposta.ok) {
        alert(
          resultado.erro ||
            "Não foi possível realizar o cadastro."
        );

        return;
      }

      alert(
        resultado.mensagem ||
          "Usuário cadastrado com sucesso!"
      );

     
      setFormulario({
        nome: "",
        sobrenome: "",
        email: "",
        senha: "",
        confirmarSenha: "",
      });

      setMostrarSenha(false);
      setMostrarConfirmacao(false);

    } catch (erro) {
      console.error(
        "ERRO AO CONECTAR COM O FLASK:"
      );

      console.error(erro);

      alert(
        "Não foi possível conectar ao servidor.\n\n" +
        "Verifique se o Flask está rodando em:\n" +
        "http://127.0.0.1:5000"
      );

    } finally {
      setCarregando(false);
    }
  }


  return (
    <main className="pagina-cadastro">

      {/* Fundo vermelho */}
      <div className="fundo-vermelho"></div>

      <section className="cadastro">

     

        <div className="logo-area">

          <div className="logo-circulo">

            <img
              src={logoIgreja}
              alt="Logo da igreja"
            />

          </div>

        </div>


        <div className="cabecalho">

          <h1>
            Seja
            <span>bem-vindo!</span>
          </h1>

          <p>
            Crie sua conta e faça parte
            <br />
            desta missão de fé e louvor.
          </p>

        </div>


        <form onSubmit={cadastrar}>

          {/* NOME E SOBRENOME */}

          <div className="linha-nomes">

            <div className="campo">

              <label htmlFor="nome">
                Nome
              </label>

              <div className="input-container">

                <span>♙</span>

                <input
                  id="nome"
                  type="text"
                  name="nome"
                  placeholder="Digite seu nome"
                  value={formulario.nome}
                  onChange={handleChange}
                  autoComplete="given-name"
                  required
                />

              </div>

            </div>

            <div className="campo">

              <label htmlFor="sobrenome">
                Sobrenome
              </label>

              <div className="input-container">

                <span>♙</span>

                <input
                  id="sobrenome"
                  type="text"
                  name="sobrenome"
                  placeholder="Digite seu sobrenome"
                  value={formulario.sobrenome}
                  onChange={handleChange}
                  autoComplete="family-name"
                  required
                />

              </div>

            </div>

          </div>

        

          <div className="campo">

            <label htmlFor="email">
              E-mail
            </label>

            <div className="input-container">

              <span>✉</span>

              <input
                id="email"
                type="email"
                name="email"
                placeholder="seuemail@gmail.com"
                value={formulario.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />

            </div>

          </div>


          <div className="campo">

            <label htmlFor="senha">
              Senha
            </label>

            <div className="input-container">

              <span>🔒</span>

              <input
                id="senha"
                type={
                  mostrarSenha
                    ? "text"
                    : "password"
                }
                name="senha"
                placeholder="••••••••••"
                value={formulario.senha}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={6}
                required
              />

              <button
                type="button"
                className="botao-olho"
                aria-label={
                  mostrarSenha
                    ? "Esconder senha"
                    : "Mostrar senha"
                }
                onClick={() =>
                  setMostrarSenha(
                    (anterior) => !anterior
                  )
                }
              >
                {mostrarSenha ? "◉" : "◌"}
              </button>

            </div>

          </div>



          <div className="campo">

            <label htmlFor="confirmarSenha">
              Confirmar senha
            </label>

            <div className="input-container">

              <span>🔒</span>

              <input
                id="confirmarSenha"
                type={
                  mostrarConfirmacao
                    ? "text"
                    : "password"
                }
                name="confirmarSenha"
                placeholder="••••••••••"
                value={formulario.confirmarSenha}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={6}
                required
              />

              <button
                type="button"
                className="botao-olho"
                aria-label={
                  mostrarConfirmacao
                    ? "Esconder confirmação"
                    : "Mostrar confirmação"
                }
                onClick={() =>
                  setMostrarConfirmacao(
                    (anterior) => !anterior
                  )
                }
              >
                {mostrarConfirmacao ? "◉" : "◌"}
              </button>

            </div>

          </div>


          <button
            type="submit"
            className="botao-cadastrar"
            disabled={carregando}
          >

            <span>
              {carregando
                ? "Cadastrando..."
                : "Cadastrar"}
            </span>

            <span>→</span>

          </button>

        </form>


        <div className="separador">

          <span></span>

          <p>OU CADASTRE-SE COM</p>

          <span></span>

        </div>

        

        <div className="botoes-social">

          <button
            type="button"
            onClick={() =>
              alert(
                "O cadastro com Google será configurado na próxima etapa."
              )
            }
          >
            <strong>G</strong>
            Google
          </button>

          <button
            type="button"
            onClick={() =>
              alert(
                "O cadastro por e-mail já está conectado ao Flask."
              )
            }
          >
            ✉
            E-mail
          </button>

        </div>


        <div className="rodape">

          <p>Já tem uma conta?</p>

          <button
            type="button"
            onClick={() =>
              alert(
                "A tela de login será criada na próxima etapa."
              )
            }
          >
            Entrar
          </button>

        </div>

      </section>

    </main>
  );
}

export default Login;