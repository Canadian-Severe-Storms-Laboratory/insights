import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Tailwind,
    Text,
    type TailwindConfig
} from '@react-email/components';

const tailwindConfig: TailwindConfig = {
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif']
            }
        }
    }
};

export default function MagicLink({ link }: { link: string }) {
    return (
        <Html>
            <Head />
            <Tailwind config={tailwindConfig}>
                <Body className="font-inter bg-white">
                    <Preview>Verify with this magic link.</Preview>
                    <Container className="mx-auto my-0 px-6.25 pt-5 pb-12">
                        <Img
                            src="https://raw.githubusercontent.com/Canadian-Severe-Storms-Laboratory/insights/refs/heads/main/docs/icons/cssl-dark.gif"
                            height={100}
                            width={100}
                            alt="CSSL Logo"
                        />
                        <Heading as="h2" className="text-[22px] font-bold">
                            CSSL Insights
                        </Heading>
                        <Heading className="mt-12 text-[28px] font-bold">
                            Verify your email address
                        </Heading>
                        <Section className="mx-0 my-6">
                            <Text className="text-base leading-6.5">
                                <Link href={link}>Click here to verify your email</Link>
                            </Text>
                            <Text className="text-base leading-6.5">
                                If you didn't request this, please ignore this email.
                            </Text>
                        </Section>
                        <Text className="text-base leading-6.5">
                            Best,
                            <br />- CSSL Team
                        </Text>
                        <Hr className="mt-12 border-[#dddddd]" />
                        <Text className="ml-1 text-xs leading-6 text-[#8898aa]">
                            Canadian Severe Storm Laboratory, Western University
                        </Text>
                        <Text className="ml-1 text-xs leading-6 text-[#8898aa]">
                            1151 Richmond St, London, ON N6A 3K7, Canada
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
